import { Request, Response, NextFunction } from "express"
import prisma from "../config/db"
import { batchLogSchema } from "../validators/schemas"
import {
  calculateDailyMetrics,
  identifyHotspotAndGuidance,
  MetricLogItem,
  AdditiveLogItem,
} from "../services/mathEngine"
import { VectorType } from "@prisma/client"

/**
 * Resolves a userId or handle to a valid User ID
 */
export async function resolveUserId(userIdOrHandle?: string): Promise<string> {
  const target = userIdOrHandle || "@aanya"
  if (target.startsWith("@")) {
    let user = await prisma.user.findUnique({
      where: { handle: target },
      select: { id: true },
    })
    if (!user) {
      user = await prisma.user.create({
        data: {
          handle: target,
          name: target === "@aanya" ? "Aanya Verma" : target.replace("@", ""),
        },
        select: { id: true },
      })
    }
    return user.id
  }

  let user = await prisma.user.findUnique({
    where: { id: target },
    select: { id: true },
  })

  if (!user) {
    let fallback = await prisma.user.findFirst({ select: { id: true } })
    if (!fallback) {
      fallback = await prisma.user.create({
        data: { handle: "@aanya", name: "Aanya Verma" },
        select: { id: true },
      })
    }
    return fallback.id
  }

  return user.id
}

const KEY_ALIASES: Record<string, string> = {
  petrol: "petrol_car",
  petrol_car: "petrol_car",
  diesel: "diesel_car",
  diesel_car: "diesel_car",
  twoWheeler: "two_wheeler",
  two_wheeler: "two_wheeler",
  apparel: "apparel",
  footwear: "footwear",
  transit: "public_transit_shifted",
  public_transit_shifted: "public_transit_shifted",
  saplings: "saplings_planted",
  saplings_planted: "saplings_planted",
  careDays: "plant_care_days",
  plant_care_days: "plant_care_days",
}

/**
 * POST /api/logs - Batch log activities for a day
 */
export async function batchLogActivities(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validated = batchLogSchema.parse(req.body)
    const userId = await resolveUserId(validated.userId)

    const [year, month, day] = validated.logDate.split("-").map(Number)
    const logDate = new Date(Date.UTC(year, month - 1, day))

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch user to check daily limit
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })

      // 2. Normalize keys with KEY_ALIASES and fetch emission factors
      const normalizedEntries = validated.entries.map((e) => ({
        ...e,
        normalizedKey: KEY_ALIASES[e.activityKey] || e.activityKey,
      }))

      const keys = [...new Set(normalizedEntries.map((e) => e.normalizedKey))]
      const factors = await tx.emissionFactor.findMany({
        where: { activityKey: { in: keys } },
      })

      const factorMap = new Map(factors.map((f) => [f.activityKey, f]))

      // 3. Filter out quantity === 0, insert non-zero activity logs
      const validEntries = normalizedEntries.filter((e) => e.quantity > 0)

      for (const entry of validEntries) {
        const factor = factorMap.get(entry.normalizedKey)
        if (!factor) {
          throw new Error(`Unknown activity key: ${entry.activityKey} (${entry.normalizedKey})`)
        }

        const computedCo2e = Number((entry.quantity * factor.factorValue).toFixed(2))

        await tx.activityLog.create({
          data: {
            userId,
            factorId: factor.id,
            logDate,
            quantity: entry.quantity,
            factorApplied: factor.factorValue,
            computedCo2e,
          },
        })
      }

      // 4. Re-query all ActivityLogs for this (userId, logDate)
      const dayLogs = await tx.activityLog.findMany({
        where: { userId, logDate },
        include: { factor: true },
        orderBy: { createdAt: "asc" },
      })

      // 5. Compute daily metrics using pure math engine
      const metricItems: MetricLogItem[] = dayLogs.map((l) => ({
        vectorType: l.factor.vectorType,
        computedCo2e: l.computedCo2e,
      }))

      const metrics = calculateDailyMetrics(metricItems, user.dailyLimitKg)

      // 6. Identify top hotspot & generate guidance
      const additiveItems: AdditiveLogItem[] = dayLogs
        .filter((l) => l.factor.vectorType === VectorType.ADDITIVE)
        .map((l) => ({
          activityKey: l.factor.activityKey,
          label: l.factor.label,
          computedCo2e: l.computedCo2e,
          quantity: l.quantity,
          unit: l.factor.unit,
        }))

      const diagnostics = identifyHotspotAndGuidance(additiveItems, metrics.budgetDelta)

      // 7. Upsert DailyLedger
      const ledger = await tx.dailyLedger.upsert({
        where: {
          userId_logDate: {
            userId,
            logDate,
          },
        },
        update: {
          totalGross: metrics.totalGross,
          totalOffset: metrics.totalOffset,
          netEmissions: metrics.netEmissions,
          budgetDelta: metrics.budgetDelta,
          status: metrics.status,
          topHotspotKey: diagnostics.topHotspotKey,
        },
        create: {
          userId,
          logDate,
          totalGross: metrics.totalGross,
          totalOffset: metrics.totalOffset,
          netEmissions: metrics.netEmissions,
          budgetDelta: metrics.budgetDelta,
          status: metrics.status,
          topHotspotKey: diagnostics.topHotspotKey,
        },
      })

      return {
        ledger,
        logs: dayLogs.map((l) => ({
          id: l.id,
          activityKey: l.factor.activityKey,
          label: l.factor.label,
          category: l.factor.category,
          vectorType: l.factor.vectorType,
          quantity: l.quantity,
          unit: l.factor.unit,
          factorApplied: l.factorApplied,
          computedCo2e: l.computedCo2e,
          createdAt: l.createdAt,
        })),
        diagnostics,
      }
    })

    res.status(200).json({
      success: true,
      message: "Activities logged and daily ledger updated",
      data: result,
    })
  } catch (error: any) {
    next(error)
  }
}

/**
 * DELETE /api/logs/:logId - Delete an activity log and recalculate ledger
 */
export async function deleteActivityLog(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawLogId = req.params.logId
    const logId = Array.isArray(rawLogId) ? rawLogId[0] : rawLogId

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.activityLog.findUnique({
        where: { id: logId },
        include: { factor: true },
      })

      if (!existing) {
        throw new Error("Activity log not found")
      }

      const { userId, logDate } = existing

      // Delete the record
      await tx.activityLog.delete({ where: { id: logId } })

      // Fetch user limit
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })

      // Re-query remaining logs for the day
      const remainingLogs = await tx.activityLog.findMany({
        where: { userId, logDate },
        include: { factor: true },
      })

      if (remainingLogs.length === 0) {
        // Delete ledger or reset to 0
        await tx.dailyLedger.deleteMany({
          where: { userId, logDate },
        })

        return {
          deletedLogId: logId,
          ledger: null,
          remainingLogsCount: 0,
        }
      }

      // Recalculate metrics
      const metricItems: MetricLogItem[] = remainingLogs.map((l) => ({
        vectorType: l.factor.vectorType,
        computedCo2e: l.computedCo2e,
      }))

      const metrics = calculateDailyMetrics(metricItems, user.dailyLimitKg)

      const additiveItems: AdditiveLogItem[] = remainingLogs
        .filter((l) => l.factor.vectorType === VectorType.ADDITIVE)
        .map((l) => ({
          activityKey: l.factor.activityKey,
          label: l.factor.label,
          computedCo2e: l.computedCo2e,
          quantity: l.quantity,
          unit: l.factor.unit,
        }))

      const diagnostics = identifyHotspotAndGuidance(additiveItems, metrics.budgetDelta)

      const updatedLedger = await tx.dailyLedger.update({
        where: {
          userId_logDate: {
            userId,
            logDate,
          },
        },
        data: {
          totalGross: metrics.totalGross,
          totalOffset: metrics.totalOffset,
          netEmissions: metrics.netEmissions,
          budgetDelta: metrics.budgetDelta,
          status: metrics.status,
          topHotspotKey: diagnostics.topHotspotKey,
        },
      })

      return {
        deletedLogId: logId,
        ledger: updatedLedger,
        remainingLogsCount: remainingLogs.length,
      }
    })

    res.json({
      success: true,
      message: "Log entry removed and daily ledger recalculated",
      data: result,
    })
  } catch (error: any) {
    if (error.message === "Activity log not found") {
      res.status(404).json({ success: false, error: error.message })
      return
    }
    next(error)
  }
}
