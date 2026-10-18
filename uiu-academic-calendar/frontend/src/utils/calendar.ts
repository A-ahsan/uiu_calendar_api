// Turns the scraped calendars.json into clean, structured data for the UI.
// Handles every date style seen on uiu.ac.bd:
//   "Feb 25, 2026"  "Feb 23 - 25, 2026"  "Mar 17 – 27, 2026"  "June 14, 2026"
//   "May 26 – Jun 05, 2026"  "Dec 21, 2025 - Jan 7, 2026"  "Jan 30- Feb 9 2026"

export type RawCalendar = {
  title: string
  url?: string
  events: string[]
  items?: { date: string; day: string; text: string }[] // newer scraper output (separate columns)
  notes?: string[]
}

export type Program = 'ug' | 'grad' | 'pharm'
export type Category = 'registration' | 'classes' | 'exam' | 'holiday' | 'payment' | 'admission' | 'result' | 'other'

export type CalEvent = {
  id: string
  dateText: string // as written by UIU, tidied
  dayText: string
  title: string
  marks: number // number of footnote asterisks (*, **, …), 0 if none
  footnote?: string
  start: Date | null
  end: Date | null
  category: Category
}

export type Term = {
  id: string // e.g. "fall-2026-ug"
  title: string
  season: string // Spring | Summer | Fall
  year: number
  unit: string // Trimester | Semester
  program: Program
  revised: boolean
  events: CalEvent[]
  notes: string[]
  start: Date | null
  end: Date | null
}

export const CATEGORY_META: Record<Category, { label: string; plural: string }> = {
  registration: { label: 'Registration', plural: 'Registration' },
  classes: { label: 'Classes', plural: 'Classes' },
  exam: { label: 'Exam', plural: 'Exams' },
  payment: { label: 'Payment', plural: 'Payments' },
  holiday: { label: 'Holiday', plural: 'Holidays' },
  result: { label: 'Grades', plural: 'Grades' },
  admission: { label: 'Admission', plural: 'Admission' },
  other: { label: 'Other', plural: 'Other' },
}

export const PROGRAMS: { id: Program; label: string; short: string }[] = [
  { id: 'ug', label: 'Undergraduate', short: 'Undergrad' },
  { id: 'grad', label: 'Graduate', short: 'Graduate' },
  { id: 'pharm', label: 'B. Pharm', short: 'B. Pharm' },
]

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
}
const month = (s?: string) => (s ? MONTHS[s.toLowerCase().slice(0, s.toLowerCase().startsWith('sept') ? 4 : 3)] : undefined)

/** Fix text glued together by the scraper and normalise punctuation. */
export function tidy(s: string): string {
  return (s || '')
    .replace(/ /g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/’/g, "'")
    .replace(/(\*+)\s*(and)\s*/gi, '$1 and ') // "Purnima****andMay" → "Purnima**** and May"
    .replace(/(\d)\s+(st|nd|rd|th)\b/g, '$1$2') // "1 st Installment" → "1st Installment"
    .replace(/([a-z)\]])(\d+(?:st|nd|rd|th)\b)/gi, '$1 $2') // ")2nd" → ") 2nd"
    .replace(/(\d)(st|nd|rd|th)(?=[A-Z])/g, '$1$2 ') // "1stAdmission" → "1st Admission"
    .replace(/([A-Za-z)])\:(?=[A-Za-z0-9])/g, '$1: ') // "Trimester:1st" → "Trimester: 1st"
    .replace(/([a-z])\.(?=[A-Z][a-z])/g, '$1. ')
    .replace(/\s+/g, ' ')
    .trim()
}

const DAY = '(?:Sat|Sun|Mon|Tue|Wed|Thu|Fri)[a-z]*\\.?'
const MON = '([A-Za-z]{3,9})\\.?'
// start: Mon D[, YYYY]  then optional  - [Mon] D[, YYYY]
const DATE_RE = new RegExp(`^${MON}\\s+(\\d{1,2})(?:,?\\s*(\\d{4}))?(?:\\s*-\\s*(?:${MON}\\s+)?(\\d{1,2})(?:,?\\s*(\\d{4}))?)?`)
const DAY_RE = new RegExp(`^\\s*(${DAY}(?:\\s*-\\s*${DAY})?)\\s*`, 'i')

type Parsed = { dateText: string; dayText: string; title: string; start: Date | null; end: Date | null }

/** Parse the date part ("Dec 21, 2025 - Jan 7, 2026") into start/end dates. */
export function parseDate(dateText: string): { start: Date | null; end: Date | null; rest: string } {
  const t = tidy(dateText)
  const m = t.match(DATE_RE)
  if (!m) return { start: null, end: null, rest: t }
  const [all, m1, d1, y1, m2, d2, y2] = m
  const sm = month(m1)
  if (sm === undefined || (!y1 && !y2)) return { start: null, end: null, rest: t }
  const em = m2 ? month(m2) : sm
  if (em === undefined) return { start: null, end: null, rest: t }
  const endYear = Number(y2 || y1)
  const startYear = y1 ? Number(y1) : sm > em ? endYear - 1 : endYear // "Dec 28 - Jan 3, 2026"
  const start = new Date(startYear, sm, Number(d1))
  const end = d2 ? new Date(endYear, em, Number(d2)) : new Date(startYear, sm, Number(d1))
  return { start, end: end < start ? start : end, rest: t.slice(all.length) }
}

/** Parse one event line: "<date> <weekday(s)> <description>". */
export function parseLine(line: string): Parsed {
  const t = tidy(line)
  const { start, end, rest } = parseDate(t)
  if (!start) return { dateText: '', dayText: '', title: t, start: null, end: null }
  const dateText = t.slice(0, t.length - rest.length).replace(/[,\s]+$/, '')
  const dm = rest.match(DAY_RE)
  const dayText = dm ? dm[1].replace(/\s*-\s*/, ' – ') : ''
  const title = (dm ? rest.slice(dm[0].length) : rest).trim()
  return { dateText, dayText, title, start, end }
}

export function categorize(title: string): Category {
  const t = title.toLowerCase()
  if (/admission/.test(t)) return 'admission'
  if (/exam|quiz|\btest\b/.test(t) && !/grade/.test(t)) return 'exam'
  if (/regist|advising|\badd\b|adding|drop|withdraw/.test(t)) return 'registration'
  if (/install|payment|\bfees?\b|\bfine\b/.test(t)) return 'payment'
  if (/result|grade/.test(t)) return 'result'
  if (/holiday|closed|vacation|break|suspend|eid|puja|independence|victory|mother language|new year/.test(t)) return 'holiday'
  if (/class|lecture|orientation|trimester begins|semester begins/.test(t)) return 'classes'
  return 'other'
}

/** Pull out footnote asterisks ("Final Exam ***") so they can be linked to the matching note. */
function splitMarks(title: string): { title: string; marks: number } {
  const runs = title.match(/\*+/g)
  if (!runs) return { title, marks: 0 }
  const marks = Math.max(...runs.map(r => r.length))
  const clean = title.replace(/\s*\*+\s*/g, ' ').replace(/\s+([/,)])/g, '$1').replace(/\s+/g, ' ').trim()
  return { title: clean, marks }
}

function footnoteFor(notes: string[], marks: number, title: string): string | undefined {
  if (!marks) return undefined
  const re = new RegExp(`^\\*{${marks}}(?!\\*)\\s*`)
  const hit = notes.find(n => re.test(n))
  if (hit) return hit.replace(re, '').trim()
  // UIU sometimes uses a different number of stars than the note; holidays marked with stars are moon-dependent
  if (/holiday|eid|shab|miladunnabi|ashura|puja|purnima/i.test(title)) {
    const moon = notes.find(n => /appearance of the moon/i.test(n))
    if (moon) return moon.replace(/^\*+\s*/, '').trim()
  }
  return undefined
}

/** UIU sometimes puts several events in one cell: "Last day to drop … Last day of Course Advising … Last day of Grade Submission …" */
function splitCombined(title: string): string[] {
  // (no regex lookbehind: older iPhone Safari can't parse it)
  return title.replace(/([a-z0-9).\/-])\s+(Last (?:day|date|Day|Date)\b)/g, '$1\n$2').split('\n').map(s => s.trim()).filter(Boolean)
}

export function parseTitle(raw: string) {
  const title = tidy(raw)
  const tm = title.match(/(Spring|Summer|Fall|Autumn|Winter)\s+(\d{4})/i)
  const season = tm ? tm[1][0].toUpperCase() + tm[1].slice(1).toLowerCase() : ''
  const year = tm ? Number(tm[2]) : 0
  const unit = /semester/i.test(title) ? 'Semester' : 'Trimester'
  const program: Program = /pharm/i.test(title) ? 'pharm' : /undergraduate/i.test(title) ? 'ug' : /graduate|master|mba/i.test(title) ? 'grad' : 'ug'
  return { title, season, year, unit, program, revised: /revised/i.test(title) }
}

const SEASON_ORDER: Record<string, number> = { Spring: 1, Summer: 2, Fall: 3, Autumn: 3, Winter: 4 }

export function buildTerms(raw: RawCalendar[]): Term[] {
  const seen = new Map<string, number>()
  return raw.map((cal, ci) => {
    const meta = parseTitle(cal.title)
    const notes = (cal.notes || []).map(tidy).filter(Boolean)
    const lines: Parsed[] = cal.items?.length
      ? cal.items.map(it => {
          const p = parseLine(`${it.date} ${it.day} ${it.text}`)
          return p.start ? p : { ...p, title: tidy(it.text), dateText: tidy(it.date), dayText: tidy(it.day) }
        })
      : (cal.events || []).map(parseLine)
    const events: CalEvent[] = lines.flatMap((p, i) => splitCombined(p.title).map((part, j) => {
      const { title, marks } = splitMarks(part)
      return { id: `${ci}-${i}-${j}`, dateText: p.dateText, dayText: p.dayText, title, marks, footnote: footnoteFor(notes, marks, title), start: p.start, end: p.end, category: categorize(title) }
    }))
    const dated = events.filter(e => e.start).sort((a, b) => a.start!.getTime() - b.start!.getTime())
    const undated = events.filter(e => !e.start)
    let id = `${meta.season || 'term'}-${meta.year || ci}-${meta.program}`.toLowerCase()
    const n = (seen.get(id) || 0) + 1
    seen.set(id, n)
    if (n > 1) id += `-${n}`
    return {
      ...meta, id, notes,
      events: [...dated, ...undated],
      start: dated[0]?.start ?? null,
      end: dated.reduce<Date | null>((m, e) => (!m || e.end! > m ? e.end : m), null),
    }
  }).sort((a, b) => b.year - a.year || (SEASON_ORDER[b.season] || 0) - (SEASON_ORDER[a.season] || 0))
}

// ---- dates relative to today ----
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 864e5)

export type Status = 'past' | 'today' | 'ongoing' | 'upcoming' | 'unknown'
export function statusOf(e: CalEvent, today: Date): Status {
  if (!e.start || !e.end) return 'unknown'
  const t = startOfDay(today)
  if (e.end < t) return 'past'
  if (e.start > t) return 'upcoming'
  return e.start.getTime() === e.end.getTime() ? 'today' : 'ongoing'
}

export function relative(e: CalEvent, today: Date): string {
  const s = statusOf(e, today)
  if (s === 'today') return 'Today'
  if (s === 'ongoing') { const left = daysBetween(today, e.end!); return left === 0 ? 'Ends today' : `Ongoing · ${left} day${left === 1 ? '' : 's'} left` }
  if (s === 'upcoming') { const n = daysBetween(today, e.start!); return n === 1 ? 'Tomorrow' : n < 14 ? `In ${n} days` : n < 60 ? `In ${Math.round(n / 7)} weeks` : `In ${Math.round(n / 30)} months` }
  return ''
}

/** Term to open first: the next term if it starts within 3 weeks (registration time), else the one running today,
 *  else the next to start, else the latest. */
export function pickDefaultTerm(terms: Term[], program: Program, today: Date): Term | undefined {
  const list = terms.filter(t => t.program === program && t.start && t.end)
  const t = startOfDay(today)
  const next = [...list].filter(x => x.start! > t).sort((a, b) => a.start!.getTime() - b.start!.getTime())[0]
  if (next && daysBetween(t, next.start!) <= 21) return next
  return list.find(x => x.start! <= t && x.end! >= t) || next || terms.find(x => x.program === program)
}

const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Short date label for the date tile: { top: "24–26", bottom: "Oct" } or across months { top: "26", bottom: "May – Jun 5" } */
export function dateTile(e: CalEvent): { top: string; bottom: string } {
  if (!e.start || !e.end) return { top: '—', bottom: '' }
  const s = e.start, en = e.end
  if (s.getTime() === en.getTime()) return { top: String(s.getDate()), bottom: MON_SHORT[s.getMonth()] }
  if (s.getMonth() === en.getMonth() && s.getFullYear() === en.getFullYear()) return { top: `${s.getDate()}–${en.getDate()}`, bottom: MON_SHORT[s.getMonth()] }
  return { top: `${s.getDate()} ${MON_SHORT[s.getMonth()]}`, bottom: `– ${en.getDate()} ${MON_SHORT[en.getMonth()]}` }
}

export const fmtDate = (d: Date) => `${d.toLocaleDateString('en-GB', { weekday: 'short' })}, ${d.getDate()} ${MON_SHORT[d.getMonth()]} ${d.getFullYear()}`
export const termLabel = (t: Term) => `${t.season} ${t.year}`.trim() || t.title
