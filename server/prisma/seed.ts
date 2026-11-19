import { PrismaClient, FactorCategory, VectorType, LedgerStatus } from "@prisma/client"
import { calculateDailyMetrics, identifyHotspotAndGuidance, MetricLogItem, AdditiveLogItem } from "../src/services/mathEngine"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding Carbon Engine database...")

  // Clean existing data
  await prisma.activityLog.deleteMany({})
  await prisma.dailyLedger.deleteMany({})
  await prisma.emissionFactor.deleteMany({})
  await prisma.user.deleteMany({})

  // 1. Seed 8 Verified Emission & Offset Factors
  const factorsData = [
    {
      activityKey: "petrol_car",
      label: "Petrol car",
      category: FactorCategory.TRANSPORT,
      vectorType: VectorType.ADDITIVE,
      factorValue: 0.21,
      unit: "km",
      sourceStandard: "DEFRA",
    },
    {
      activityKey: "diesel_car",
      label: "Diesel car",
      category: FactorCategory.TRANSPORT,
      vectorType: VectorType.ADDITIVE,
      factorValue: 0.25,
      unit: "km",
      sourceStandard: "DEFRA",
    },
    {
      activityKey: "two_wheeler",
      label: "Two-wheeler",
      category: FactorCategory.TRANSPORT,
      vectorType: VectorType.ADDITIVE,
      factorValue: 0.07,
      unit: "km",
      sourceStandard: "DEFRA",
    },
    {
      activityKey: "apparel",
      label: "Apparel",
      category: FactorCategory.RETAIL,
      vectorType: VectorType.ADDITIVE,
      factorValue: 8.0,
      unit: "units",
      sourceStandard: "DEFRA",
    },
    {
      activityKey: "footwear",
      label: "Footwear",
      category: FactorCategory.RETAIL,
      vectorType: VectorType.ADDITIVE,
      factorValue: 12.0,
      unit: "pairs",
      sourceStandard: "DEFRA",
    },
    {
      activityKey: "public_transit_shifted",
      label: "Public transit shifted",
      category: FactorCategory.TRANSIT_OFFSET,
      vectorType: VectorType.SUBTRACTIVE,
      factorValue: 0.18,
      unit: "km",
      sourceStandard: "DEFRA",
    },
    {
      activityKey: "saplings_planted",
      label: "Saplings planted",
      category: FactorCategory.BIO_OFFSET,
      vectorType: VectorType.SUBTRACTIVE,
      factorValue: 2.3,
      unit: "trees",
      sourceStandard: "IPCC",
    },
    {
      activityKey: "plant_care_days",
      label: "Plant care days",
      category: FactorCategory.BIO_OFFSET,
      vectorType: VectorType.SUBTRACTIVE,
      factorValue: 0.12,
      unit: "days",
      sourceStandard: "IPCC",
    },
  ]

  const factorMap = new Map<string, any>()
  for (const f of factorsData) {
    const created = await prisma.emissionFactor.create({ data: f })
    factorMap.set(f.activityKey, created)
  }
  console.log(`✅ Seeded ${factorsData.length} Emission & Offset Factors`)

  // 2. Seed 5 Campus Users
  const usersData = [
    {
      handle: "@earthling_riya",
      name: "Riya Sharma",
      heightCm: 162,
      weightKg: 54,
      age: 21,
      baselineCommuteKm: 5,
      targetScore: 3.2,
    },
    {
      handle: "@greensteps",
      name: "GreenSteps Club",
      heightCm: 170,
      weightKg: 65,
      age: 22,
      baselineCommuteKm: 4,
      targetScore: 4.1,
    },
    {
      handle: "@aanya",
      name: "Aanya Verma",
      heightCm: 165,
      weightKg: 60,
      age: 20,
      baselineCommuteKm: 8,
      targetScore: 4.8,
    },
    {
      handle: "@plantpowered",
      name: "Arjun Patel",
      heightCm: 178,
      weightKg: 72,
      age: 21,
      baselineCommuteKm: 12,
      targetScore: 5.4,
    },
    {
      handle: "@lowcarbonleo",
      name: "Leo Das",
      heightCm: 175,
      weightKg: 68,
      age: 23,
      baselineCommuteKm: 15,
      targetScore: 6.7,
    },
  ]

  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth()
  const currentDay = now.getUTCDate()

  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        handle: u.handle,
        name: u.name,
        heightCm: u.heightCm,
        weightKg: u.weightKg,
        age: u.age,
        baselineCommuteKm: u.baselineCommuteKm,
        dailyLimitKg: 5.0,
        monthlyQuotaKg: 150.0,
      },
    })

    // 14 days of realistic activity logs and daily ledgers
    for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
      const logDate = new Date(Date.UTC(currentYear, currentMonth, currentDay - dayOffset))

      // Generate calibrated activities based on targetScore
      const dayFactor = (dayOffset % 3) * 0.4
      const targetNet = u.targetScore + dayFactor

      const activities: { key: string; qty: number }[] = []

      if (targetNet <= 4.0) {
        // Highly sustainable
        activities.push({ key: "two_wheeler", qty: 6 })
        activities.push({ key: "public_transit_shifted", qty: 8 })
        activities.push({ key: "plant_care_days", qty: 1 })
        if (dayOffset % 5 === 0) {
          activities.push({ key: "saplings_planted", qty: 1 })
        }
      } else if (targetNet <= 5.0) {
        // Sustainable around daily limit
        activities.push({ key: "two_wheeler", qty: 12 })
        activities.push({ key: "petrol_car", qty: 5 })
        activities.push({ key: "public_transit_shifted", qty: 4 })
        activities.push({ key: "plant_care_days", qty: 1 })
      } else {
        // Deficit days
        activities.push({ key: "petrol_car", qty: 15 })
        activities.push({ key: "two_wheeler", qty: 10 })
        if (dayOffset % 6 === 0) {
          activities.push({ key: "apparel", qty: 1 })
        }
        activities.push({ key: "public_transit_shifted", qty: 3 })
      }

      // Insert ActivityLogs
      const createdLogs = []
      for (const act of activities) {
        const factor = factorMap.get(act.key)
        const computedCo2e = Number((act.qty * factor.factorValue).toFixed(2))

        const aLog = await prisma.activityLog.create({
          data: {
            userId: user.id,
            factorId: factor.id,
            logDate,
            quantity: act.qty,
            factorApplied: factor.factorValue,
            computedCo2e,
          },
          include: { factor: true },
        })
        createdLogs.push(aLog)
      }

      // Calculate DailyLedger
      const metricItems: MetricLogItem[] = createdLogs.map((l) => ({
        vectorType: l.factor.vectorType,
        computedCo2e: l.computedCo2e,
      }))
      const metrics = calculateDailyMetrics(metricItems, user.dailyLimitKg)

      const additiveItems: AdditiveLogItem[] = createdLogs
        .filter((l) => l.factor.vectorType === VectorType.ADDITIVE)
        .map((l) => ({
          activityKey: l.factor.activityKey,
          label: l.factor.label,
          computedCo2e: l.computedCo2e,
          quantity: l.quantity,
          unit: l.factor.unit,
        }))
      const diagnostics = identifyHotspotAndGuidance(additiveItems, metrics.budgetDelta)

      await prisma.dailyLedger.create({
        data: {
          userId: user.id,
          logDate,
          totalGross: metrics.totalGross,
          totalOffset: metrics.totalOffset,
          netEmissions: metrics.netEmissions,
          budgetDelta: metrics.budgetDelta,
          status: metrics.status,
          topHotspotKey: diagnostics.topHotspotKey,
        },
      })
    }
  }

  console.log("✅ Seeded 5 campus users with 14 days of ActivityLogs & DailyLedgers")
  console.log("✨ Seeding completed successfully.")
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
