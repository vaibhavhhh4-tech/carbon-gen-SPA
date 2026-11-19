import { Request, Response, NextFunction } from "express"
import prisma from "../config/db"
import { resolveUserId } from "./logController"
import { calculateStreak, formatDateToIso } from "../services/streakService"
import { calendarQuerySchema } from "../validators/schemas"
import {
  identifyHotspotAndGuidance,
  AdditiveLogItem,
} from "../services/mathEngine"
import { FactorCategory, LedgerStatus, VectorType } from "@prisma/client"

/**
 * GET /api/dashboard/:userId
 */
export async function getDashboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawUserId = req.params.userId || (req.query.userId as string)
    const userIdOrHandle = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId

    if (!userIdOrHandle) {
      res.status(400).json({ success: false, error: "userId parameter is required" })
      return
    }

    const userId = await resolveUserId(userIdOrHandle)
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

    const now = new Date()
    const todayStr = formatDateToIso(now)
    const [year, month, day] = todayStr.split("-").map(Number)
    const todayDate = new Date(Date.UTC(year, month - 1, day))

    // 1. Today's ledger & logs
    const todayLedger = await prisma.dailyLedger.findUnique({
      where: {
        userId_logDate: {
          userId,
          logDate: todayDate,
        },
      },
    })

    const todayLogs = await prisma.activityLog.findMany({
      where: { userId, logDate: todayDate },
      include: { factor: true },
    })

    const todayNetKg = todayLedger ? todayLedger.netEmissions : 0
    const todayStatus = todayLedger ? todayLedger.status : LedgerStatus.SUSTAINABLE
    const guidelinePct = Number(
      Math.min(100, (todayNetKg / user.dailyLimitKg) * 100).toFixed(0)
    )

    // Diagnostics for today
    const additiveLogs: AdditiveLogItem[] = todayLogs
      .filter((l) => l.factor.vectorType === VectorType.ADDITIVE)
      .map((l) => ({
        activityKey: l.factor.activityKey,
        label: l.factor.label,
        computedCo2e: l.computedCo2e,
        quantity: l.quantity,
        unit: l.factor.unit,
      }))

    const diagnostics = identifyHotspotAndGuidance(
      additiveLogs,
      todayLedger ? todayLedger.budgetDelta : 0
    )

    // 2. Month-to-date metrics
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1))
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))

    const monthLedgers = await prisma.dailyLedger.findMany({
      where: {
        userId,
        logDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    })

    const monthlyConsumedKg = Number(
      monthLedgers.reduce((acc, l) => acc + l.netEmissions, 0).toFixed(2)
    )

    // Active students count
    const activeStudentsCount = await prisma.user.count()

    // 3. Category Breakdown for Charts (Monthly)
    const monthLogs = await prisma.activityLog.findMany({
      where: {
        userId,
        logDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: { factor: true },
    })

    const categoryBreakdown: Record<FactorCategory, number> = {
      TRANSPORT: 0,
      RETAIL: 0,
      TRANSIT_OFFSET: 0,
      BIO_OFFSET: 0,
    }

    for (const log of monthLogs) {
      categoryBreakdown[log.factor.category] = Number(
        (categoryBreakdown[log.factor.category] + log.computedCo2e).toFixed(2)
      )
    }

    // 4. Streak
    const streak = await calculateStreak(userId, now)

    res.json({
      success: true,
      data: {
        hero: {
          monthlyQuotaKg: user.monthlyQuotaKg,
          monthlyConsumedKg,
          dailyLimitKg: user.dailyLimitKg,
          todayNetKg,
          guidelinePercentage: guidelinePct,
          status: todayStatus,
          activeStudentsCount,
        },
        diagnostics: {
          topHotspot: diagnostics.topHotspotKey,
          topHotspotLabel: diagnostics.topHotspotLabel,
          topHotspotEmissions: diagnostics.topHotspotEmissions,
          proportionalOffset: diagnostics.proportionalOffset,
          tips: diagnostics.tips,
        },
        categoryBreakdown,
        streak,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/calendar/:userId?year=2026&month=11
 */
export async function getCalendar(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawUserId = req.params.userId || (req.query.userId as string)
    const userIdOrHandle = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId

    if (!userIdOrHandle) {
      res.status(400).json({ success: false, error: "userId parameter is required" })
      return
    }

    const userId = await resolveUserId(userIdOrHandle)
    const query = calendarQuerySchema.parse(req.query)

    const now = new Date()
    const year = query.year ?? now.getUTCFullYear()
    const month = query.month ?? now.getUTCMonth() + 1 // 1-indexed

    const startOfMonth = new Date(Date.UTC(year, month - 1, 1))
    const totalDaysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))

    // Fetch ledgers for this month
    const ledgers = await prisma.dailyLedger.findMany({
      where: {
        userId,
        logDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: { logDate: "asc" },
    })

    // Fetch granular logs for this month
    const logs = await prisma.activityLog.findMany({
      where: {
        userId,
        logDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: { factor: true },
      orderBy: { createdAt: "asc" },
    })

    const ledgerByDay = new Map<number, (typeof ledgers)[0]>()
    for (const l of ledgers) {
      ledgerByDay.set(new Date(l.logDate).getUTCDate(), l)
    }

    const logsByDay = new Map<number, any[]>()
    for (const log of logs) {
      const d = new Date(log.logDate).getUTCDate()
      const list = logsByDay.get(d) || []
      list.push({
        id: log.id,
        activityKey: log.factor.activityKey,
        label: log.factor.label,
        category: log.factor.category,
        vectorType: log.factor.vectorType,
        quantity: log.quantity,
        unit: log.factor.unit,
        computedCo2e: log.computedCo2e,
      })
      logsByDay.set(d, list)
    }

    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

    // Build day-by-day array
    const days = []
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dateObj = new Date(Date.UTC(year, month - 1, dayNum))
      const dateStr = formatDateToIso(dateObj)
      const ledger = ledgerByDay.get(dayNum)
      const items = logsByDay.get(dayNum) || []

      let dayStatus: "SUSTAINABLE" | "DEFICIT" | "UNLOGGED" | "FUTURE"

      if (dateObj > todayUtc) {
        dayStatus = "FUTURE"
      } else if (!ledger) {
        dayStatus = "UNLOGGED"
      } else {
        dayStatus = ledger.status
      }

      days.push({
        day: dayNum,
        date: dateStr,
        status: dayStatus,
        totalGross: ledger ? ledger.totalGross : 0,
        totalOffset: ledger ? ledger.totalOffset : 0,
        netEmissions: ledger ? ledger.netEmissions : 0,
        budgetDelta: ledger ? ledger.budgetDelta : 0,
        topHotspotKey: ledger ? ledger.topHotspotKey : null,
        items,
      })
    }

    const streak = await calculateStreak(userId, now)

    res.json({
      success: true,
      data: {
        year,
        month,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        days,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/leaderboard - Rolling 7-day average netEmissions (CEm score)
 */
export async function getLeaderboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const now = new Date()
    const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7))

    const users = await prisma.user.findMany({
      select: {
        id: true,
        handle: true,
        name: true,
        dailyLedgers: {
          where: {
            logDate: { gte: sevenDaysAgo },
          },
          select: { netEmissions: true },
        },
      },
    })

    const scores = users.map((u) => {
      let cemScore = 4.8 // default baseline if no logs
      if (u.dailyLedgers.length > 0) {
        const sum = u.dailyLedgers.reduce((acc, l) => acc + l.netEmissions, 0)
        cemScore = Number((sum / u.dailyLedgers.length).toFixed(2))
      }

      return {
        userId: u.id,
        handle: u.handle,
        name: u.name,
        cemScore,
      }
    })

    // Sort ascending: lowest carbon emission = Rank #1
    scores.sort((a, b) => a.cemScore - b.cemScore)

    const total = scores.length
    const ranked = scores.map((item, index) => {
      const rank = index + 1
      const isTopHalf = rank <= Math.ceil(total / 2)
      return {
        rank,
        userId: item.userId,
        handle: item.handle,
        name: item.name,
        cemScore: item.cemScore,
        isTopHalf,
      }
    })

    res.json({
      success: true,
      data: ranked,
    })
  } catch (error) {
    next(error)
  }
}
