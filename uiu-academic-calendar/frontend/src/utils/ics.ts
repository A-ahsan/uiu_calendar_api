// "Add to calendar": an .ics file that Google Calendar, Apple Calendar and Outlook can import.
import type { Term } from './calendar'
import { termLabel } from './calendar'

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

// Lines longer than 75 characters must be folded (RFC 5545)
function fold(line: string) {
  const out: string[] = []
  let rest = line
  while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = ' ' + rest.slice(74) }
  out.push(rest)
  return out.join('\r\n')
}

export function downloadIcs(term: Term) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//UIU Academic Calendar//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:UIU ${esc(termLabel(term))}`]
  term.events.forEach((e, i) => {
    if (!e.start || !e.end) return
    const endExclusive = new Date(e.end.getFullYear(), e.end.getMonth(), e.end.getDate() + 1)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${term.id}-${i}-${ymd(e.start)}@uiu-calendar`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(e.start)}`,
      `DTEND;VALUE=DATE:${ymd(endExclusive)}`,
      fold(`SUMMARY:${esc(e.title)}`),
      ...(e.footnote ? [fold(`DESCRIPTION:${esc(e.footnote)}`)] : []),
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    )
  })
  lines.push('END:VCALENDAR')
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `uiu-${term.id}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
