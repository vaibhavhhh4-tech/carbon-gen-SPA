/**
 * Carbon Engine Client API Service
 * Connects Next.js Frontend with the Node/Express/Prisma Backend
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api"

export interface ApiProfile {
  id?: string
  handle: string
  name: string
  heightCm?: number | null
  weightKg?: number | null
  age?: number | null
  baselineCommuteKm?: number | null
}

export interface ActivityInputs {
  petrol: number
  diesel: number
  twoWheeler: number
  apparel: number
  footwear: number
  transit: number
  saplings: number
  careDays: number
}

export interface ApiDashboardHero {
  monthlyQuotaKg: number
  monthlyConsumedKg: number
  dailyLimitKg: number
  todayNetKg: number
  guidelinePercentage: number
  status: "SUSTAINABLE" | "DEFICIT"
  activeStudentsCount: number
}

export interface ApiDiagnosticTip {
  no: string
  tag: string
  title: string
  desc: string
  color: string
  impact: string
}

export interface ApiLeaderboardEntry {
  rank: number
  userId: string
  handle: string
  name: string
  cemScore: number
  isTopHalf: boolean
}

export interface ApiCalendarDay {
  day: number
  date: string
  status: "SUSTAINABLE" | "DEFICIT" | "UNLOGGED" | "FUTURE"
  totalGross: number
  totalOffset: number
  netEmissions: number
  budgetDelta: number
  topHotspotKey: string | null
  items: Array<{
    id: string
    activityKey: string
    label: string
    quantity: number
    unit: string
    computedCo2e: number
  }>
}

/**
 * Check backend connection status
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Fetch profile for a user handle (e.g. '@aanya')
 */
export async function fetchProfile(userIdOrHandle = "@aanya") {
  try {
    const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(userIdOrHandle)}`, {
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return { success: true, data: json.data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Save user baseline profile
 */
export async function saveProfile(data: ApiProfile) {
  try {
    const res = await fetch(`${API_BASE}/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return { success: true, data: json.data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Fetch dashboard overview (hero, diagnostics, category breakdown, streak)
 */
export async function fetchDashboard(userIdOrHandle = "@aanya") {
  try {
    const res = await fetch(`${API_BASE}/dashboard/${encodeURIComponent(userIdOrHandle)}`, {
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return { success: true, data: json.data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Fetch calendar history for a given year & month
 */
export async function fetchCalendar(
  userIdOrHandle = "@aanya",
  year?: number,
  month?: number
) {
  try {
    const params = new URLSearchParams()
    if (year) params.append("year", String(year))
    if (month) params.append("month", String(month))

    const url = `${API_BASE}/calendar/${encodeURIComponent(userIdOrHandle)}?${params.toString()}`
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return { success: true, data: json.data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Fetch rolling 7-day campus leaderboard
 */
export async function fetchLeaderboard() {
  try {
    const res = await fetch(`${API_BASE}/leaderboard`, { cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return { success: true, data: json.data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Batch log activities for a specific date
 */
export async function logActivities(
  userIdOrHandle: string,
  logDate: string,
  activity: ActivityInputs
) {
  try {
    // Map activity inputs into batch array
    const entries = [
      { activityKey: "petrol_car", quantity: activity.petrol },
      { activityKey: "diesel_car", quantity: activity.diesel },
      { activityKey: "two_wheeler", quantity: activity.twoWheeler },
      { activityKey: "apparel", quantity: activity.apparel },
      { activityKey: "footwear", quantity: activity.footwear },
      { activityKey: "public_transit_shifted", quantity: activity.transit },
      { activityKey: "saplings_planted", quantity: activity.saplings },
      { activityKey: "plant_care_days", quantity: activity.careDays },
    ]

    const payload = {
      userId: userIdOrHandle,
      logDate,
      entries,
    }

    const res = await fetch(`${API_BASE}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => null)
      throw new Error(errJson?.error || `HTTP ${res.status}`)
    }

    const json = await res.json()
    return { success: true, data: json.data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
