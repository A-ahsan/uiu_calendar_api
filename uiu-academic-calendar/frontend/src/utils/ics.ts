// Calendar files (.ics) for "Add to calendar" downloads and the "Subscribe" feeds.
// The same code runs in the browser (download) and at build time (vite.config.ts writes /ics/*.ics).
//
// Event IDs (UID) are based on the trimester and the event's name, not its date, so when UIU moves
// a date the calendar app moves the event instead of adding a second copy.
import type { Term, Program } from './calendar'
import { termLabel, PROGRAMS } from './calendar'

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

// Lines longer than 75 characters must be folded (RFC 5545)
function fold(line: string) {
  const out: string[] = []
  let rest = line
  while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = ' ' + rest.slice(74) }
  out.push(rest)
  return out.join('\r\n')
}

function eventLines(term: Term, stamp: string): string[] {
  const seen = new Map<string, number>()
  const lines: string[] = []
  for (const e of term.events) {
    if (!e.start || !e.end) continue
    const base = `${term.id}-${slug(e.title)}`
    const n = (seen.get(base) || 0) + 1 // same name twice in a term (e.g. "Regular Saturday Class")
    seen.set(base, n)
    const endExclusive = new Date(e.end.getFullYear(), e.end.getMonth(), e.end.getDate() + 1)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${base}${n > 1 ? `-${n}` : ''}@uiu-calendar`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(e.start)}`,
      `DTEND;VALUE=DATE:${ymd(endExclusive)}`,
      fold(`SUMMARY:${esc(e.title)}`),
      ...(e.footnote ? [fold(`DESCRIPTION:${esc(e.footnote)}`)] : []),
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    )
  }
  return lines
}

function wrap(name: string, events: string[]) {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//UIU Academic Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    fold(`X-WR-CALNAME:${esc(name)}`),
    'X-WR-TIMEZONE:Asia/Dhaka',
    // ask subscribing apps to check for changes twice a day (Apple and Outlook honour this; Google uses its own schedule)
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n'
}

const stampNow = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
const programLabel = (p: Program) => PROGRAMS.find(x => x.id === p)?.label || p

/** One trimester / semester. */
export function buildTermIcs(term: Term): string {
  return wrap(`UIU ${termLabel(term)} (${programLabel(term.program)})`, eventLines(term, stampNow()))
}

/** Every term of one program; new trimesters appear in subscribed calendars automatically. */
export function buildProgramIcs(terms: Term[], program: Program): string {
  const stamp = stampNow()
  return wrap(`UIU Academic Calendar (${programLabel(program)})`, terms.filter(t => t.program === program).flatMap(t => eventLines(t, stamp)))
}

/** Where the subscription feeds live (generated at build time). */
export const feedPath = { term: (t: Term) => `/ics/${t.id}.ics`, program: (p: Program) => `/ics/${p}.ics` }

export function downloadIcs(term: Term) {
  const blob = new Blob([buildTermIcs(term)], { type: 'text/calendar;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `uiu-${term.id}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
