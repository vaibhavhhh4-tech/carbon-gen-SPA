import { VectorType, LedgerStatus } from "@prisma/client"

export interface MetricLogItem {
  vectorType: VectorType
  computedCo2e: number
}

export interface DailyMetricsResult {
  totalGross: number
  totalOffset: number
  netEmissions: number
  budgetDelta: number
  status: LedgerStatus
}

export interface AdditiveLogItem {
  activityKey: string
  label?: string
  computedCo2e: number
  quantity: number
  unit?: string
}

export interface DiagnosticTip {
  no: string
  tag: string
  title: string
  desc: string
  color: string
  impact: string
}

export interface HotspotGuidanceResult {
  topHotspotKey: string | null
  topHotspotLabel: string | null
  topHotspotEmissions: number
  proportionalOffset: {
    transitShiftKmNeeded: number
    saplingsNeeded: number
  } | null
  tips: DiagnosticTip[]
}

/**
 * Deterministic daily metrics calculation
 * E_gross = \sum (Q_i * EF_i)
 * O_total = \sum (M_j * OF_j)
 * E_net = E_gross - O_total
 * \Delta_budget = E_net - \theta_target
 */
export function calculateDailyMetrics(
  logs: MetricLogItem[],
  dailyLimit = 5.0
): DailyMetricsResult {
  let grossSum = 0
  let offsetSum = 0

  for (const item of logs) {
    if (item.vectorType === VectorType.ADDITIVE) {
      grossSum += item.computedCo2e
    } else if (item.vectorType === VectorType.SUBTRACTIVE) {
      offsetSum += item.computedCo2e
    }
  }

  const totalGross = Number(grossSum.toFixed(2))
  const totalOffset = Number(offsetSum.toFixed(2))
  const netEmissions = Number((totalGross - totalOffset).toFixed(2))
  const budgetDelta = Number((netEmissions - dailyLimit).toFixed(2))
  const status: LedgerStatus = budgetDelta <= 0 ? LedgerStatus.SUSTAINABLE : LedgerStatus.DEFICIT

  return {
    totalGross,
    totalOffset,
    netEmissions,
    budgetDelta,
    status,
  }
}

/**
 * Deterministic Hotspot & Diagnostic Guidance Rules
 */
export function identifyHotspotAndGuidance(
  additiveLogs: AdditiveLogItem[],
  budgetDelta: number
): HotspotGuidanceResult {
  if (additiveLogs.length === 0) {
    return {
      topHotspotKey: null,
      topHotspotLabel: null,
      topHotspotEmissions: 0,
      proportionalOffset: null,
      tips: [
        {
          no: "01",
          tag: "GETTING AROUND",
          title: "Trade the car for the metro",
          desc: "Swap a 5 km drive for a metro ride and save about 0.9 kg CO₂e.",
          color: "tip-blue",
          impact: "−0.9 kg / trip",
        },
        {
          no: "02",
          tag: "BUYING MINDFULLY",
          title: "Give good things a longer life",
          desc: "Repair, rewear, and re-love your footwear and apparel before buying new.",
          color: "tip-orange",
          impact: "Less made, less emitted",
        },
        {
          no: "03",
          tag: "GROWING TOGETHER",
          title: "Care for a sapling nearby",
          desc: "A planted tree needs consistent watering and care to grow into a real offset.",
          color: "tip-green",
          impact: "Care makes it count",
        },
      ],
    }
  }

  // Find the single additive log with the maximum computed CO2e
  const sorted = [...additiveLogs].sort((a, b) => b.computedCo2e - a.computedCo2e)
  const top = sorted[0]

  const proportionalOffset =
    budgetDelta > 0
      ? {
          transitShiftKmNeeded: Math.ceil(budgetDelta / 0.18),
          saplingsNeeded: Math.ceil(budgetDelta / 2.3),
        }
      : null

  const tips: DiagnosticTip[] = [
    {
      no: "01",
      tag: "GETTING AROUND",
      title: "Trade the car for the metro",
      desc:
        budgetDelta > 0 && proportionalOffset
          ? `Shift ${proportionalOffset.transitShiftKmNeeded} km of car commute to public transit to neutralize today's deficit.`
          : "Swap a 5 km drive for a metro ride and save about 0.9 kg CO₂e.",
      color: "tip-blue",
      impact:
        budgetDelta > 0 && proportionalOffset
          ? `−${(proportionalOffset.transitShiftKmNeeded * 0.18).toFixed(1)} kg CO₂e`
          : "−0.9 kg / trip",
    },
    {
      no: "02",
      tag: "BUYING MINDFULLY",
      title: "Give good things a longer life",
      desc:
        top.activityKey === "footwear" || top.activityKey === "apparel"
          ? `${top.label || top.activityKey} was your largest emission source today (${top.computedCo2e.toFixed(1)} kg). Caring for existing items delays high-emission manufacturing.`
          : "Repair, rewear, and re-love your footwear and apparel before buying new.",
      color: "tip-orange",
      impact: "Less made, less emitted",
    },
    {
      no: "03",
      tag: "GROWING TOGETHER",
      title: "Care for a sapling nearby",
      desc:
        budgetDelta > 0 && proportionalOffset
          ? `Planting ${proportionalOffset.saplingsNeeded} sapling(s) (2.3 kg CO₂e each) offsets today's excess footprint.`
          : "A planted tree needs consistent watering and care to grow into a real offset.",
      color: "tip-green",
      impact: "Care makes it count",
    },
  ]

  return {
    topHotspotKey: top.activityKey,
    topHotspotLabel: top.label || top.activityKey,
    topHotspotEmissions: Number(top.computedCo2e.toFixed(2)),
    proportionalOffset,
    tips,
  }
}
