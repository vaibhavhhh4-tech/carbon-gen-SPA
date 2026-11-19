"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { ArrowDownRight, ArrowRight, ArrowUpRight, Bus, CalendarDays, Check, ChevronDown, CircleHelp, Footprints, Leaf, Menu, Plus, Sprout, TrendingDown, TreeDeciduous, X, Zap } from "lucide-react"
import * as api from "@/lib/api"

type Activity = { petrol: number; diesel: number; twoWheeler: number; apparel: number; footwear: number; transit: number; saplings: number; careDays: number }
type Profile = { height: string; weight: string; age: string; commute: string; name?: string }
type DailyLog = { activity: Activity; gross: number; offset: number; net: number }
type LeaderboardRow = { name: string; score: number; initials: string; color: string; current?: boolean }

const emptyActivity: Activity = { petrol: 0, diesel: 0, twoWheeler: 0, apparel: 0, footwear: 0, transit: 0, saplings: 0, careDays: 0 }
const factors: Record<keyof Activity, number> = { petrol: 0.21, diesel: 0.25, twoWheeler: 0.07, apparel: 8, footwear: 12, transit: 0, saplings: 0, careDays: 0 }
const offsets: Record<keyof Activity, number> = { petrol: 0, diesel: 0, twoWheeler: 0, apparel: 0, footwear: 0, transit: 0.18, saplings: 2.3, careDays: 0.12 }

const defaultSeedScores: LeaderboardRow[] = [
  { name: "@earthling_riya", score: 3.2, initials: "ER", color: "sage" },
  { name: "@greensteps", score: 4.1, initials: "GS", color: "blue" },
  { name: "@aanya", score: 4.8, initials: "AV", color: "gold", current: true },
  { name: "@plantpowered", score: 5.4, initials: "PP", color: "rose" },
  { name: "@lowcarbonleo", score: 6.7, initials: "LL", color: "lavender" },
]

const fieldLabels: { key: keyof Activity; label: string; unit: string; icon: typeof Bus; group: "add" | "offset" }[] = [
  { key: "petrol", label: "Petrol car", unit: "km", icon: Bus, group: "add" },
  { key: "diesel", label: "Diesel car", unit: "km", icon: Bus, group: "add" },
  { key: "twoWheeler", label: "Two-wheeler", unit: "km", icon: Zap, group: "add" },
  { key: "apparel", label: "Apparel", unit: "units", icon: Footprints, group: "add" },
  { key: "footwear", label: "Footwear", unit: "pairs", icon: Footprints, group: "add" },
  { key: "transit", label: "Public transit shifted", unit: "km", icon: Bus, group: "offset" },
  { key: "saplings", label: "Saplings planted", unit: "trees", icon: Sprout, group: "offset" },
  { key: "careDays", label: "Plant care days", unit: "days", icon: Leaf, group: "offset" },
]

function calculateActivity(activity: Activity): DailyLog {
  const gross = fieldLabels.filter((field) => field.group === "add").reduce((sum, field) => sum + activity[field.key] * factors[field.key], 0)
  const offset = fieldLabels.filter((field) => field.group === "offset").reduce((sum, field) => sum + activity[field.key] * offsets[field.key], 0)
  return { activity, gross, offset, net: Math.max(0, gross - offset) }
}

function createMockHistory(): Record<number, DailyLog> {
  const today = new Date().getDate()
  const loggedDays = [1, 2, 3, 5, 6, 7, 9, 10, 12, 13, 14, 16, 17].filter((day) => day < today)
  return Object.fromEntries(loggedDays.map((day) => [day, calculateActivity({
    petrol: day % 4 === 0 ? 7 : 0,
    diesel: day % 5 === 0 ? 6 : 0,
    twoWheeler: day % 2 === 0 ? 13 : 0,
    apparel: day % 6 === 0 ? 1 : 0,
    footwear: day % 13 === 0 ? 1 : 0,
    transit: day % 3 === 0 ? 4 : 0,
    saplings: day % 11 === 0 ? 1 : 0,
    careDays: day % 7 === 0 ? 2 : 0,
  })]))
}

function Navbar({ onProfile, isBackendLive, userName }: { onProfile: () => void; isBackendLive: boolean; userName: string }) {
  const [open, setOpen] = useState(false)
  return <header className="nav-wrap"><nav className="nav-shell" aria-label="Main navigation">
    <a href="#home" className="brand"><span className="brand-mark"><Leaf size={20} strokeWidth={2.5} /></span><span>carbon<span className="brand-light">engine</span><small>ICS 354 · IET Lucknow</small></span></a>
    <div className="nav-links">
      <a href="#calendar">My activity</a>
      <a href="#community">Community</a>
      <a href="#guides">Guides</a>
      <span style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 9px", borderRadius: "20px", background: isBackendLive ? "#e3f2e6" : "#f5eedb", color: isBackendLive ? "#2d6a4f" : "#8c6b2d", fontWeight: 800 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: isBackendLive ? "#40916c" : "#d4a373" }} />
        {isBackendLive ? "API Connected" : "Local Mode"}
      </span>
      <button className="profile-chip" onClick={onProfile}><span className="mini-avatar">{userName.charAt(0) || "A"}</span> {userName || "Aanya"} <ChevronDown size={15} /></button>
    </div>
    <button className="menu-button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    {open && <div className="mobile-menu">
      <a onClick={() => setOpen(false)} href="#calendar">My activity</a>
      <a onClick={() => setOpen(false)} href="#community">Community</a>
      <a onClick={() => setOpen(false)} href="#guides">Guides</a>
      <button onClick={() => { setOpen(false); onProfile() }}>Edit profile ({userName || "Aanya"})</button>
    </div>}
  </nav></header>
}

function Hero({ onUpdate, daily, activeStudents, monthlyQuota, monthlyConsumed }: { onUpdate: () => void; daily: number; activeStudents: number; monthlyQuota: number; monthlyConsumed: number }) {
  const pct = Math.min(100, (daily / 5) * 100)
  return <section id="home" className="hero">
    <div className="hero-inner"><div className="hero-copy"><div className="eyebrow"><span className="live-dot" /> YOUR FOOTPRINT, IN FOCUS</div><h1>Small steps.<br /><span>Lasting impact.</span></h1><p className="hero-intro">A clearer picture of your carbon, one thoughtful choice at a time.</p>
      <div className="quota-row">
        <div className="quota-card monthly">
          <div className="quota-icon"><CalendarDays size={18} /></div>
          <div><span className="quota-label">MONTHLY CO₂ QUOTA</span><strong>{monthlyQuota.toFixed(1)} <small>kg CO₂e</small></strong><span className="quota-caption">{monthlyConsumed > 0 ? `${monthlyConsumed.toFixed(1)} kg used` : "Your monthly allowance"}</span></div>
        </div>
        <div className="quota-card daily-card">
          <div className="quota-icon"><Leaf size={18} /></div>
          <div><span className="quota-label">DAILY GUIDELINE</span><strong>5.0 <small>kg CO₂e / day</small></strong><span className="quota-caption">IPCC per-capita ceiling</span></div>
        </div>
      </div>
      <button className="primary-button" onClick={onUpdate}><Plus size={19} strokeWidth={2.5} /> Today&apos;s Update <ArrowRight size={17} /></button>
    </div>
    <div className="hero-art" aria-label="Daily carbon footprint summary">
      <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
      <div className="leaf-stamp"><TreeDeciduous size={67} strokeWidth={1.5} /></div>
      <div className="art-note">
        <div className="note-top"><span className="note-icon"><TrendingDown size={16} /></span><span>YOUR DAILY FOOTPRINT</span></div>
        <div className="note-value">{daily.toFixed(1)} <span>kg CO₂e</span></div>
        <div className="progress-track"><span style={{ width: `${pct}%` }} /></div>
        <div className="note-bottom"><span>{daily <= 5 ? "Within your guideline" : "A little over today"}</span><strong>{pct.toFixed(0)}%</strong></div>
      </div>
      <div className="art-tag tag-top"><Leaf size={12} /> Every choice counts</div>
      <div className="art-tag tag-bottom"><span className="tag-avatars">A&nbsp; M&nbsp; J</span> {activeStudents} students tracking</div>
    </div>
    </div><div className="hero-foot"><span><span className="foot-line" /> BUILT FOR A LIGHTER TOMORROW</span><span>SCROLL TO EXPLORE <span className="scroll-mark">↓</span></span></div>
  </section>
}

function StreakCalendar({ history, streak, selectedDay, onSelectDay }: { history: Record<number, DailyLog>; streak: number; selectedDay: number | null; onSelectDay: (day: number) => void }) {
  const now = new Date()
  const today = now.getDate()
  const first = new Date(now.getFullYear(), now.getMonth(), 1).getDay()
  const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)]
  const selectedLog = selectedDay === null ? null : history[selectedDay]
  return <section className="panel calendar-panel" id="calendar"><div className="panel-heading"><div><div className="section-kicker">YOUR CONSISTENCY</div><h2>Activity calendar</h2></div><span className="month-pill"><CalendarDays size={14} /> {now.toLocaleString("en", { month: "short", year: "numeric" })}</span></div>
    <div className="streak-banner"><span className="streak-icon"><Zap size={20} fill="currentColor" /></span><div><strong>{streak} day streak</strong><span>You&apos;re building a lovely habit</span></div><span className="streak-sparks">✳ ✳ ✳</span></div>
    <div className="calendar-grid" role="grid" aria-label="Monthly carbon activity calendar">{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span className="weekday" key={`${d}${i}`}>{d}</span>)}{cells.map((day, i) => {
      const log = day === null ? undefined : history[day]
      const status = !day || day > today ? "future" : !log ? "unlogged" : log.net <= 5 ? "sustainable" : "deficit"
      return day ? <button key={i} type="button" role="gridcell" aria-pressed={day === selectedDay} aria-label={`Day ${day}${log ? `, ${log.net <= 5 ? "sustainable" : "over guideline"}, ${log.net.toFixed(1)} kg CO2e` : day > today ? ", upcoming" : ", no activity logged"}`} disabled={!log} onClick={() => onSelectDay(day)} className={`day-cell ${status} ${day === today ? "today" : ""} ${day === selectedDay ? "selected-day" : ""}`}>{day}</button> : <span key={i} className="day-cell empty" aria-hidden="true" />
    })}</div>
    <div className="calendar-legend"><span><i className="legend-dot green" />Sustainable</span><span><i className="legend-dot orange" />Over guideline</span><span><i className="legend-dot blank" />Not logged</span></div>
    {selectedLog && selectedDay !== null && <div className="day-detail" aria-live="polite"><div className="day-detail-heading"><span><CalendarDays size={15} /> {now.toLocaleString("en", { month: "long" })} {selectedDay}</span><span className={`day-status ${selectedLog.net <= 5 ? "good" : "high"}`}>{selectedLog.net <= 5 ? "Sustainable" : "Over guideline"}</span></div><div className="day-detail-stats"><div><small>GROSS</small><strong>{selectedLog.gross.toFixed(1)} <span>kg</span></strong></div><div><small>OFFSETS</small><strong>−{selectedLog.offset.toFixed(1)} <span>kg</span></strong></div><div><small>NET CO₂e</small><strong>{selectedLog.net.toFixed(1)} <span>kg</span></strong></div></div><div className="day-activity-list">{fieldLabels.filter((field) => selectedLog.activity[field.key] > 0).map((field) => <span key={field.key}>{field.label} <strong>{selectedLog.activity[field.key]} {field.unit}</strong></span>)}{fieldLabels.every((field) => selectedLog.activity[field.key] === 0) && <span>No activity details recorded.</span>}</div></div>}
  </section>
}

function Leaderboard({ rows, score }: { rows: LeaderboardRow[]; score: number }) {
  const sortedRows = useMemo(() => {
    return [...rows.map((r) => r.current ? { ...r, score } : r)].sort((a, b) => a.score - b.score)
  }, [rows, score])

  return <section className="panel leaderboard-panel" id="community"><div className="panel-heading"><div><div className="section-kicker">A LITTLE FRIENDLY MOTIVATION</div><h2>Campus leaderboard</h2></div><span className="week-pill">THIS WEEK <span>↗</span></span></div><p className="leader-sub">Lower net emissions, higher on the board.</p>
    <div className="rank-list">{sortedRows.map((row, i) => <div className={`rank-row ${row.current ? "rank-current" : ""}`} key={row.name}><span className={`rank-number ${i < 3 ? `rank-${i + 1}` : ""}`}>{String(i + 1).padStart(2, "0")}</span><span className={`rank-avatar avatar-${row.color}`}>{row.initials}</span><span className="rank-name">{row.name}{row.current && <small>THAT&apos;S YOU</small>}</span><span className="rank-score">{row.score.toFixed(1)} <small>kg</small></span>{row.current && <span className="you-marker"><ArrowRight size={13} /></span>}</div>)}</div>
    <div className="leader-foot"><span className="campus-dot" /> You&apos;re in the <strong>top half</strong> of your campus</div>
  </section>
}

function TipsSection({ daily, customTips }: { daily: number; customTips?: api.ApiDiagnosticTip[] | null }) {
  const tips = customTips && customTips.length > 0 ? customTips : [
    { no: "01", tag: "GETTING AROUND", title: "Trade the car for the metro", desc: "Swap a 5 km drive for a metro ride and save about 0.9 kg CO₂e.", color: "tip-blue", impact: "−0.9 kg / trip" },
    { no: "02", tag: "BUYING MINDFULLY", title: "Give good things a longer life", desc: "Repair, rewear, and re-love your footwear and apparel before buying new.", color: "tip-orange", impact: "Less made, less emitted" },
    { no: "03", tag: "GROWING TOGETHER", title: "Care for a sapling nearby", desc: "A planted tree needs consistent watering and care to grow into a real offset.", color: "tip-green", impact: "Care makes it count" },
  ]
  const icons = [Bus, Footprints, Sprout]

  return <section id="guides" className="tips-section"><div className="tips-head"><div><div className="section-kicker">GOOD TO KNOW</div><h2>A few ideas for<br /><span>a lighter footprint.</span></h2></div><div className="tips-aside"><span className="aside-icon"><Leaf size={19} /></span><p>{daily > 5 ? "You’re a bit over your daily guide. Start with a small swap today." : "You’re on track today. Keep the momentum with one small swap."}</p></div></div>
    <div className="tips-grid">{tips.map((tip, idx) => {
      const Icon = icons[idx % icons.length] || Leaf
      return <article className={`tip-card ${tip.color || "tip-blue"}`} key={tip.no}><div className="tip-top"><span className="tip-icon"><Icon size={20} /></span><span className="tip-number">{tip.no}</span></div><div className="tip-tag">{tip.tag}</div><h3>{tip.title}</h3><p>{tip.desc}</p><div className="tip-impact"><span>{tip.impact}</span><ArrowUpRight size={16} /></div></article>
    })}</div>
  </section>
}

function ModalShell({ title, subtitle, onClose, children, className = "" }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode; className?: string }) {
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><section className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label="Close dialog" onClick={onClose}><X size={19} /></button><div className="modal-eyebrow"><Leaf size={14} /> CARBON ENGINE</div><h2 id="modal-title">{title}</h2><p className="modal-subtitle">{subtitle}</p>{children}</section></div>
}

function ProfileModal({ profile, onSave, onClose, isSaving }: { profile: Profile; onSave: (p: Profile) => void; onClose: () => void; isSaving: boolean }) {
  const [draft, setDraft] = useState(profile)
  return <ModalShell title="Your starting point" subtitle="A few basics help us make your personal baseline more useful." onClose={onClose}><div className="form-grid"><label>Height <span>cm</span><input type="number" min="80" max="250" value={draft.height} onChange={(e) => setDraft({ ...draft, height: e.target.value })} placeholder="165" /></label><label>Weight <span>kg</span><input type="number" min="20" max="300" value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: e.target.value })} placeholder="60" /></label><label>Age <span>years</span><input type="number" min="12" max="110" value={draft.age} onChange={(e) => setDraft({ ...draft, age: e.target.value })} placeholder="20" /></label><label>Daily commute <span>km</span><input type="number" min="0" max="500" value={draft.commute} onChange={(e) => setDraft({ ...draft, commute: e.target.value })} placeholder="8" /></label></div><div className="modal-info"><CircleHelp size={16} /><span>Your measurements stay in this demo and are only used for your personal baseline. No ML or profiling.</span></div><button className="primary-button modal-submit" disabled={isSaving} onClick={() => onSave(draft)}><Check size={17} /> {isSaving ? "Saving to database..." : "Save my baseline"}</button></ModalShell>
}

function ActivityModal({ onSave, onClose, isSaving }: { onSave: (a: Activity) => void; onClose: () => void; isSaving: boolean }) {
  const [values, setValues] = useState<Activity>(emptyActivity)
  const gross = fieldLabels.filter((f) => f.group === "add").reduce((sum, f) => sum + values[f.key] * factors[f.key], 0)
  const offset = fieldLabels.filter((f) => f.group === "offset").reduce((sum, f) => sum + values[f.key] * offsets[f.key], 0)
  const net = Math.max(0, gross - offset)
  const set = (key: keyof Activity, v: string) => setValues((prev) => ({ ...prev, [key]: Math.max(0, Number(v) || 0) }))
  const group = (label: string, type: "add" | "offset") => <div className="activity-group"><div className="activity-group-title"><span>{type === "add" ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}</span>{label}<small>{type === "add" ? "Adds to footprint" : "Reduces footprint"}</small></div><div className="activity-fields">{fieldLabels.filter((f) => f.group === type).map((f) => { const Icon = f.icon; return <label className="activity-field" key={f.key}><span className="field-icon"><Icon size={16} /></span><span className="field-label">{f.label}<small>{type === "add" ? `${factors[f.key]} kg CO₂e / ${f.unit}` : `${offsets[f.key]} kg CO₂e / ${f.unit}`}</small></span><input aria-label={`${f.label} ${f.unit}`} type="number" min="0" step="any" value={values[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} placeholder="0" /><span className="field-unit">{f.unit}</span></label> })}</div></div>
  return <ModalShell title="Today’s update" subtitle="Log today’s activities. Your footprint updates as you go." onClose={onClose} className="activity-modal"><div className="activity-content"><div>{group("Your activities", "add")}{group("Your positive impact", "offset")}</div><aside className="calculation-card"><div className="calc-label">LIVE CALCULATION</div><div className="calc-row"><span>Gross emissions</span><strong>{gross.toFixed(2)} <small>kg</small></strong></div><div className="calc-row offset-row"><span>Total offsets</span><strong>−{offset.toFixed(2)} <small>kg</small></strong></div><div className="calc-divider" /><div className="calc-row net-row"><span>Net emissions</span><strong>{net.toFixed(2)} <small>kg CO₂e</small></strong></div><div className={`status-flag ${net <= 5 ? "status-good" : "status-high"}`}><span />{net <= 5 ? "Sustainable · within 5.0 kg" : "Over daily guideline"}</div><p className="calc-equation">E<sub>net</sub> = E<sub>gross</sub> − O<sub>total</sub></p><button className="primary-button save-activity" disabled={isSaving} onClick={() => onSave(values)}><Check size={17} /> {isSaving ? "Saving to server..." : "Save today's log"}</button></aside></div></ModalShell>
}

export default function CarbonApp() {
  const [activity, setActivity] = useState<Activity>(emptyActivity)
  const [history, setHistory] = useState<Record<number, DailyLog>>(() => createMockHistory())
  const [selectedDay, setSelectedDay] = useState<number | null>(() => Math.max(...Object.keys(createMockHistory()).map(Number)))
  const [modal, setModal] = useState<"profile" | "activity" | null>(null)
  const [profile, setProfile] = useState<Profile>({ height: "165", weight: "60", age: "20", commute: "8", name: "Aanya" })
  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardRow[]>(defaultSeedScores)
  const [isBackendLive, setIsBackendLive] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [activeStudents, setActiveStudents] = useState<number>(248)
  const [monthlyQuota, setMonthlyQuota] = useState<number>(150.0)
  const [monthlyConsumed, setMonthlyConsumed] = useState<number>(0)
  const [serverTips, setServerTips] = useState<api.ApiDiagnosticTip[] | null>(null)
  const [streakCount, setStreakCount] = useState<number>(7)
  const [dailyFootprint, setDailyFootprint] = useState<number>(4.8)

  // Load Initial Data from Backend (with fallback)
  const loadBackendData = useCallback(async () => {
    const isLive = await api.checkBackendHealth()
    setIsBackendLive(isLive)

    if (!isLive) return

    // 1. Fetch Profile
    const profileRes = await api.fetchProfile("@aanya")
    if (profileRes.success && profileRes.data) {
      setProfile({
        name: profileRes.data.name || "Aanya",
        height: profileRes.data.heightCm ? String(profileRes.data.heightCm) : "165",
        weight: profileRes.data.weightKg ? String(profileRes.data.weightKg) : "60",
        age: profileRes.data.age ? String(profileRes.data.age) : "20",
        commute: profileRes.data.baselineCommuteKm ? String(profileRes.data.baselineCommuteKm) : "8",
      })
    }

    // 2. Fetch Dashboard Metrics
    const dashRes = await api.fetchDashboard("@aanya")
    if (dashRes.success && dashRes.data) {
      const hero = dashRes.data.hero
      if (hero) {
        setMonthlyQuota(hero.monthlyQuotaKg || 150.0)
        setMonthlyConsumed(hero.monthlyConsumedKg || 0)
        setActiveStudents(hero.activeStudentsCount || 248)
        if (hero.todayNetKg > 0) {
          setDailyFootprint(hero.todayNetKg)
        }
      }
      if (dashRes.data.streak) {
        setStreakCount(dashRes.data.streak.currentStreak || 7)
      }
      if (dashRes.data.diagnostics?.tips) {
        setServerTips(dashRes.data.diagnostics.tips)
      }
    }

    // 3. Fetch Calendar
    const calRes = await api.fetchCalendar("@aanya")
    if (calRes.success && calRes.data?.days) {
      const newHistory: Record<number, DailyLog> = {}
      for (const d of calRes.data.days as api.ApiCalendarDay[]) {
        if (d.status !== "UNLOGGED" && d.status !== "FUTURE") {
          // Reconstruct activity from items
          const act: Activity = { ...emptyActivity }
          for (const item of d.items) {
            const k = item.activityKey.replace("_car", "").replace("two_wheeler", "twoWheeler").replace("public_transit_shifted", "transit").replace("saplings_planted", "saplings").replace("plant_care_days", "careDays") as keyof Activity
            if (k in act) {
              act[k] = item.quantity
            }
          }
          newHistory[d.day] = {
            activity: act,
            gross: d.totalGross,
            offset: d.totalOffset,
            net: d.netEmissions,
          }
        }
      }
      if (Object.keys(newHistory).length > 0) {
        setHistory(newHistory)
        setSelectedDay(Math.max(...Object.keys(newHistory).map(Number)))
      }
      if (calRes.data.currentStreak !== undefined) {
        setStreakCount(calRes.data.currentStreak)
      }
    }

    // 4. Fetch Leaderboard
    const lbRes = await api.fetchLeaderboard()
    if (lbRes.success && Array.isArray(lbRes.data)) {
      const colors = ["sage", "blue", "gold", "rose", "lavender"]
      const mapped: LeaderboardRow[] = lbRes.data.map((row: api.ApiLeaderboardEntry, i: number) => ({
        name: row.handle,
        score: row.cemScore,
        initials: row.name.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "YO",
        color: colors[i % colors.length],
        current: row.handle === "@aanya",
      }))
      setLeaderboardRows(mapped)
    }
  }, [])

  useEffect(() => {
    loadBackendData()
  }, [loadBackendData])

  // Save profile baseline handler
  const handleSaveProfile = async (p: Profile) => {
    setIsSaving(true)
    setProfile(p)

    if (isBackendLive) {
      await api.saveProfile({
        handle: "@aanya",
        name: p.name || "Aanya Verma",
        heightCm: Number(p.height) || null,
        weightKg: Number(p.weight) || null,
        age: Number(p.age) || null,
        baselineCommuteKm: Number(p.commute) || 0,
      })
    }

    setIsSaving(false)
    setModal(null)
  }

  // Save daily activity update handler
  const handleSaveActivity = async (a: Activity) => {
    setIsSaving(true)
    const today = new Date().getDate()
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(today).padStart(2, "0")}`

    const localLog = calculateActivity(a)
    setActivity(a)
    setHistory((current) => ({ ...current, [today]: localLog }))
    setSelectedDay(today)
    setDailyFootprint(localLog.net)

    if (isBackendLive) {
      const res = await api.logActivities("@aanya", todayStr, a)
      if (res.success && res.data) {
        if (res.data.ledger) {
          setDailyFootprint(res.data.ledger.netEmissions)
          setHistory((current) => ({
            ...current,
            [today]: {
              activity: a,
              gross: res.data.ledger.totalGross,
              offset: res.data.ledger.totalOffset,
              net: res.data.ledger.netEmissions,
            },
          }))
        }
        if (res.data.diagnostics?.tips) {
          setServerTips(res.data.diagnostics.tips)
        }
        // Refresh dashboard and streak
        await loadBackendData()
      }
    }

    setIsSaving(false)
    setModal(null)
  }

  return <main>
    <Navbar onProfile={() => setModal("profile")} isBackendLive={isBackendLive} userName={profile.name || "Aanya"} />
    <Hero
      onUpdate={() => setModal("activity")}
      daily={dailyFootprint}
      activeStudents={activeStudents}
      monthlyQuota={monthlyQuota}
      monthlyConsumed={monthlyConsumed}
    />
    <div className="dashboard-wrap">
      <div className="dashboard-grid">
        <StreakCalendar
          history={history}
          streak={streakCount}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
        <Leaderboard rows={leaderboardRows} score={dailyFootprint} />
      </div>
      <TipsSection daily={dailyFootprint} customTips={serverTips} />
    </div>
    <footer className="site-footer">
      <div className="footer-brand"><span className="brand-mark"><Leaf size={17} /></span><strong>carbonengine</strong></div>
      <span>A student-led project for a more thoughtful tomorrow.</span>
      <span className="footer-course">ICS 354 · IET Lucknow <span>·</span> <span className="footer-dot" /> MADE FOR PEOPLE & PLANET</span>
    </footer>

    {modal === "profile" && <ProfileModal profile={profile} onClose={() => setModal(null)} onSave={handleSaveProfile} isSaving={isSaving} />}
    {modal === "activity" && <ActivityModal onClose={() => setModal(null)} onSave={handleSaveActivity} isSaving={isSaving} />}
  </main>
}
