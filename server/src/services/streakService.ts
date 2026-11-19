import prisma from "../config/db"
import { LedgerStatus } from "@prisma/client"

export function formatDateToIso(date: Date): string {
  return date.toISOString().split("T")[0]
}

export interface StreakResult {
  currentStreak: number
  longestStreak: number
}

/**
 * Calculates deterministic consecutive sustainable day streaks from DailyLedger
 */
export async function calculateStreak(
  userId: string,
  referenceDate: Date = new Date()
): Promise<StreakResult> {
  const ledgers = await prisma.dailyLedger.findMany({
    where: { userId },
    orderBy: { logDate: "asc" },
    select: {
      logDate: true,
      status: true,
    },
  })

  if (ledgers.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  // Map of date string -> status
  const ledgerMap = new Map<string, LedgerStatus>()
  for (const l of ledgers) {
    ledgerMap.set(formatDateToIso(new Date(l.logDate)), l.status)
  }

  // 1. Longest Streak
  let longestStreak = 0
  let runningStreak = 0
  let prevDate: Date | null = null

  for (const l of ledgers) {
    const curDate = new Date(l.logDate)
    const isSustainable = l.status === LedgerStatus.SUSTAINABLE

    if (!isSustainable) {
      runningStreak = 0
      prevDate = curDate
      continue
    }

    if (!prevDate) {
      runningStreak = 1
    } else {
      const diffMs = curDate.getTime() - prevDate.getTime()
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        runningStreak += 1
      } else {
        runningStreak = 1
      }
    }

    if (runningStreak > longestStreak) {
      longestStreak = runningStreak
    }
    prevDate = curDate
  }

  // 2. Current Active Streak ending today or yesterday
  const todayStr = formatDateToIso(referenceDate)
  const todayStatus = ledgerMap.get(todayStr)

  let currentStreak = 0
  const cursor = new Date(referenceDate)
  cursor.setUTCHours(0, 0, 0, 0)

  if (todayStatus !== undefined) {
    // Today is logged
    if (todayStatus === LedgerStatus.SUSTAINABLE) {
      currentStreak = 1
      cursor.setUTCDate(cursor.getUTCDate() - 1)
      while (true) {
        const dStr = formatDateToIso(cursor)
        const st = ledgerMap.get(dStr)
        if (st === LedgerStatus.SUSTAINABLE) {
          currentStreak += 1
          cursor.setUTCDate(cursor.getUTCDate() - 1)
        } else {
          break
        }
      }
    } else {
      // Deficit today breaks active streak
      currentStreak = 0
    }
  } else {
    // Today not yet logged: check from yesterday
    cursor.setUTCDate(cursor.getUTCDate() - 1)
    const yesterdayStr = formatDateToIso(cursor)
    const yesterdayStatus = ledgerMap.get(yesterdayStr)

    if (yesterdayStatus === LedgerStatus.SUSTAINABLE) {
      currentStreak = 1
      cursor.setUTCDate(cursor.getUTCDate() - 1)
      while (true) {
        const dStr = formatDateToIso(cursor)
        const st = ledgerMap.get(dStr)
        if (st === LedgerStatus.SUSTAINABLE) {
          currentStreak += 1
          cursor.setUTCDate(cursor.getUTCDate() - 1)
        } else {
          break
        }
      }
    } else {
      currentStreak = 0
    }
  }

  return {
    currentStreak,
    longestStreak,
  }
}
