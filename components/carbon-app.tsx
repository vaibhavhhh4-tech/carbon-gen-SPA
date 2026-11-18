"use client"

import { useMemo, useState } from "react"
import { ArrowDownRight, ArrowRight, ArrowUpRight, Bus, CalendarDays, Check, ChevronDown, CircleHelp, Footprints, Leaf, Menu, Plus, Sprout, TrendingDown, TreeDeciduous, X, Zap } from "lucide-react"

type Activity = { petrol: number; diesel: number; twoWheeler: number; apparel: number; footwear: number; transit: number; saplings: number; careDays: number }
type Profile = { height: string; weight: string; age: string; commute: string }
type DailyLog = { activity: Activity; gross: number; offset: number; net: number }
const emptyActivity: Activity = { petrol: 0, diesel: 0, twoWheeler: 0, apparel: 0, footwear: 0, transit: 0, saplings: 0, careDays: 0 }
const factors: Record<keyof Activity, number> = { petrol: 0.21, diesel: 0.25, twoWheeler: 0.07, apparel: 8, footwear: 12, transit: 0, saplings: 0, careDays: 0 }
const offsets: Record<keyof Activity, number> = { petrol: 0, diesel: 0, twoWheeler: 0, apparel: 0, footwear: 0, transit: 0.18, saplings: 2.3, careDays: 0.12 }
const seedScores = [
  { name: "@earthling_riya", score: 3.2, initials: "ER", color: "sage" },
  { name: "@greensteps", score: 4.1, initials: "GS", color: "blue" },
  { name: "@you", score: 4.8, initials: "YO", color: "gold", current: true },
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

function Navbar({ onProfile }: { onProfile: () => void }) {
  const [open, setOpen] = useState(false)
  return <header className="nav-wrap"><nav className="nav-shell" aria-label="Main navigation">
    <a href="#home" className="brand"><span className="brand-mark"><Leaf size={20} strokeWidth={2.5} /></span><span>carbon<span className="brand-light">engine</span><small>ICS 354 · IET Lucknow</small></span></a>
    <div className="nav-links"><a href="#calendar">My activity</a><a href="#community">Community</a><a href="#guides">Guides</a><button className="profile-chip" onClick={onProfile}><span className="mini-avatar">A</span> Aanya <ChevronDown size={15} /></button></div>
    <button className="menu-button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    {open && <div className="mobile-menu"><a onClick={() => setOpen(false)} href="#calendar">My activity</a><a onClick={() => setOpen(false)} href="#community">Community</a><a onClick={() => setOpen(false)} href="#guides">Guides</a><button onClick={() => { setOpen(false); onProfile() }}>Edit profile</button></div>}
  </nav></header>
}

function Hero({ onUpdate, daily }: { onUpdate: () => void; daily: number }) {
  const pct = Math.min(100, daily / 5 * 100)
  return <section id="home" className="hero">
    <div className="hero-inner"><div className="hero-copy"><div className="eyebrow"><span className="live-dot" /> YOUR FOOTPRINT, IN FOCUS</div><h1>Small steps.<br /><span>Lasting impact.</span></h1><p className="hero-intro">A clearer picture of your carbon, one thoughtful choice at a time.</p>
      <div className="quota-row"><div className="quota-card monthly"><div className="quota-icon"><CalendarDays size={18} /></div><div><span className="quota-label">MONTHLY CO₂ QUOTA</span><strong>150.0 <small>kg CO₂e</small></strong><span className="quota-caption">Your monthly allowance</span></div></div><div className="quota-card daily-card"><div className="quota-icon"><Leaf size={18} /></div><div><span className="quota-label">DAILY GUIDELINE</span><strong>5.0 <small>kg CO₂e / day</small></strong><span className="quota-caption">IPCC per-capita ceiling</span></div></div></div>
      <button className="primary-button" onClick={onUpdate}><Plus size={19} strokeWidth={2.5} /> Today&apos;s Update <ArrowRight size={17} /></button>
    </div><div className="hero-art" aria-label="Daily carbon footprint summary"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="leaf-stamp"><TreeDeciduous size={67} strokeWidth={1.5} /></div><div className="art-note"><div className="note-top"><span className="note-icon"><TrendingDown size={16} /></span><span>YOUR DAILY FOOTPRINT</span></div><div className="note-value">{daily.toFixed(1)} <span>kg CO₂e</span></div><div className="progress-track"><span style={{ width: `${pct}%` }} /></div><div className="note-bottom"><span>{daily <= 5 ? "Within your guideline" : "A little over today"}</span><strong>{pct.toFixed(0)}%</strong></div></div><div className="art-tag tag-top"><Leaf size={12} /> Every choice counts</div><div className="art-tag tag-bottom"><span className="tag-avatars">A&nbsp; M&nbsp; J</span> 248 students tracking</div></div>
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

function Leaderboard({ score }: { score: number }) {
  const rows = useMemo(() => [...seedScores.filter((r) => !r.current), { ...seedScores.find((r) => r.current)!, score, current: true }].sort((a, b) => a.score - b.score), [score])
  return <section className="panel leaderboard-panel" id="community"><div className="panel-heading"><div><div className="section-kicker">A LITTLE FRIENDLY MOTIVATION</div><h2>Campus leaderboard</h2></div><span className="week-pill">THIS WEEK <span>↗</span></span></div><p className="leader-sub">Lower net emissions, higher on the board.</p>
    <div className="rank-list">{rows.map((row, i) => <div className={`rank-row ${row.current ? "rank-current" : ""}`} key={row.name}><span className={`rank-number ${i < 3 ? `rank-${i + 1}` : ""}`}>{String(i + 1).padStart(2, "0")}</span><span className={`rank-avatar avatar-${row.color}`}>{row.initials}</span><span className="rank-name">{row.name}{row.current && <small>THAT&apos;S YOU</small>}</span><span className="rank-score">{row.score.toFixed(1)} <small>kg</small></span>{row.current && <span className="you-marker"><ArrowRight size={13} /></span>}</div>)}</div>
    <div className="leader-foot"><span className="campus-dot" /> You&apos;re in the <strong>top half</strong> of your campus</div>
  </section>
}

function TipsSection({ daily }: { daily: number }) {
  const tips = [
    { no: "01", icon: Bus, tag: "GETTING AROUND", title: "Trade the car for the metro", desc: "Swap a 5 km drive for a metro ride and save about 0.9 kg CO₂e.", color: "tip-blue", impact: "−0.9 kg / trip" },
    { no: "02", icon: Footprints, tag: "BUYING MINDFULLY", title: "Give good things a longer life", desc: "Repair, rewear, and re-love your footwear and apparel before buying new.", color: "tip-orange", impact: "Less made, less emitted" },
    { no: "03", icon: Sprout, tag: "GROWING TOGETHER", title: "Care for a sapling nearby", desc: "A planted tree needs consistent watering and care to grow into a real offset.", color: "tip-green", impact: "Care makes it count" },
  ]
  return <section id="guides" className="tips-section"><div className="tips-head"><div><div className="section-kicker">GOOD TO KNOW</div><h2>A few ideas for<br /><span>a lighter footprint.</span></h2></div><div className="tips-aside"><span className="aside-icon"><Leaf size={19} /></span><p>{daily > 5 ? "You’re a bit over your daily guide. Start with a small swap today." : "You’re on track today. Keep the momentum with one small swap."}</p></div></div>
    <div className="tips-grid">{tips.map((tip) => { const Icon = tip.icon; return <article className={`tip-card ${tip.color}`} key={tip.no}><div className="tip-top"><span className="tip-icon"><Icon size={20} /></span><span className="tip-number">{tip.no}</span></div><div className="tip-tag">{tip.tag}</div><h3>{tip.title}</h3><p>{tip.desc}</p><div className="tip-impact"><span>{tip.impact}</span><ArrowUpRight size={16} /></div></article> })}</div>
  </section>
}

function ModalShell({ title, subtitle, onClose, children, className = "" }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode; className?: string }) {
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><section className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label="Close dialog" onClick={onClose}><X size={19} /></button><div className="modal-eyebrow"><Leaf size={14} /> CARBON ENGINE</div><h2 id="modal-title">{title}</h2><p className="modal-subtitle">{subtitle}</p>{children}</section></div>
}
function ProfileModal({ profile, onSave, onClose }: { profile: Profile; onSave: (p: Profile) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(profile)
  return <ModalShell title="Your starting point" subtitle="A few basics help us make your personal baseline more useful." onClose={onClose}><div className="form-grid"><label>Height <span>cm</span><input type="number" min="80" max="250" value={draft.height} onChange={(e) => setDraft({ ...draft, height: e.target.value })} placeholder="165" /></label><label>Weight <span>kg</span><input type="number" min="20" max="300" value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: e.target.value })} placeholder="60" /></label><label>Age <span>years</span><input type="number" min="12" max="110" value={draft.age} onChange={(e) => setDraft({ ...draft, age: e.target.value })} placeholder="20" /></label><label>Daily commute <span>km</span><input type="number" min="0" max="500" value={draft.commute} onChange={(e) => setDraft({ ...draft, commute: e.target.value })} placeholder="8" /></label></div><div className="modal-info"><CircleHelp size={16} /><span>Your measurements stay in this demo and are only used for your personal baseline. No ML or profiling.</span></div><button className="primary-button modal-submit" onClick={() => onSave(draft)}><Check size={17} /> Save my baseline</button></ModalShell>
}
function ActivityModal({ onSave, onClose }: { onSave: (a: Activity) => void; onClose: () => void }) {
  const [values, setValues] = useState<Activity>(emptyActivity)
  const gross = fieldLabels.filter((f) => f.group === "add").reduce((sum, f) => sum + values[f.key] * factors[f.key], 0)
  const offset = fieldLabels.filter((f) => f.group === "offset").reduce((sum, f) => sum + values[f.key] * offsets[f.key], 0)
  const net = Math.max(0, gross - offset)
  const set = (key: keyof Activity, v: string) => setValues((prev) => ({ ...prev, [key]: Math.max(0, Number(v) || 0) }))
  const group = (label: string, type: "add" | "offset") => <div className="activity-group"><div className="activity-group-title"><span>{type === "add" ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}</span>{label}<small>{type === "add" ? "Adds to footprint" : "Reduces footprint"}</small></div><div className="activity-fields">{fieldLabels.filter((f) => f.group === type).map((f) => { const Icon = f.icon; return <label className="activity-field" key={f.key}><span className="field-icon"><Icon size={16} /></span><span className="field-label">{f.label}<small>{type === "add" ? `${factors[f.key]} kg CO₂e / ${f.unit}` : `${offsets[f.key]} kg CO₂e / ${f.unit}`}</small></span><input aria-label={`${f.label} ${f.unit}`} type="number" min="0" step="any" value={values[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} placeholder="0" /><span className="field-unit">{f.unit}</span></label> })}</div></div>
  return <ModalShell title="Today’s update" subtitle="Log today’s activities. Your footprint updates as you go." onClose={onClose} className="activity-modal"><div className="activity-content"><div>{group("Your activities", "add")}{group("Your positive impact", "offset")}</div><aside className="calculation-card"><div className="calc-label">LIVE CALCULATION</div><div className="calc-row"><span>Gross emissions</span><strong>{gross.toFixed(2)} <small>kg</small></strong></div><div className="calc-row offset-row"><span>Total offsets</span><strong>−{offset.toFixed(2)} <small>kg</small></strong></div><div className="calc-divider" /><div className="calc-row net-row"><span>Net emissions</span><strong>{net.toFixed(2)} <small>kg CO₂e</small></strong></div><div className={`status-flag ${net <= 5 ? "status-good" : "status-high"}`}><span />{net <= 5 ? "Sustainable · within 5.0 kg" : "Over daily guideline"}</div><p className="calc-equation">E<sub>net</sub> = E<sub>gross</sub> − O<sub>total</sub></p><button className="primary-button save-activity" onClick={() => onSave(values)}><Check size={17} /> Save today&apos;s log</button></aside></div></ModalShell>
}

export default function CarbonApp() {
  const [activity, setActivity] = useState<Activity>(emptyActivity)
  const [history, setHistory] = useState<Record<number, DailyLog>>(() => createMockHistory())
  const [selectedDay, setSelectedDay] = useState<number | null>(() => Math.max(...Object.keys(createMockHistory()).map(Number)))
  const [modal, setModal] = useState<"profile" | "activity" | null>(null)
  const [profile, setProfile] = useState<Profile>({ height: "", weight: "", age: "", commute: "" })
  const gross = fieldLabels.filter((f) => f.group === "add").reduce((sum, f) => sum + activity[f.key] * factors[f.key], 0)
  const offset = fieldLabels.filter((f) => f.group === "offset").reduce((sum, f) => sum + activity[f.key] * offsets[f.key], 0)
  const daily = activity === emptyActivity ? 4.8 : Math.max(0, gross - offset)
  const loggedDays = Object.keys(history).map(Number)
  const streak = loggedDays.includes(new Date().getDate()) ? 8 : 7
  return <main><Navbar onProfile={() => setModal("profile")} /><Hero onUpdate={() => setModal("activity")} daily={daily} /><div className="dashboard-wrap"><div className="dashboard-grid"><StreakCalendar history={history} streak={streak} selectedDay={selectedDay} onSelectDay={setSelectedDay} /><Leaderboard score={daily} /></div><TipsSection daily={daily} /></div><footer className="site-footer"><div className="footer-brand"><span className="brand-mark"><Leaf size={17} /></span><strong>carbonengine</strong></div><span>A student-led project for a more thoughtful tomorrow.</span><span className="footer-course">ICS 354 · IET Lucknow <span>·</span> <span className="footer-dot" /> MADE FOR PEOPLE & PLANET</span></footer>
    {modal === "profile" && <ProfileModal profile={profile} onClose={() => setModal(null)} onSave={(p) => { setProfile(p); setModal(null) }} />}
    {modal === "activity" && <ActivityModal onClose={() => setModal(null)} onSave={(a) => { const today = new Date().getDate(); setActivity(a); setHistory((current) => ({ ...current, [today]: calculateActivity(a) })); setSelectedDay(today); setModal(null) }} />}
  </main>
}
