import React, { useState } from 'react'
import { Calendar } from '../App'
import { PdfIcon, ChevronRight } from './icons'

export default function CalendarCard({ calendar, logoUrl }: { calendar: Calendar; logoUrl?: string }) {
  const [open, setOpen] = useState(false)
  const firstLines = calendar.events?.slice(0, 4) || []

  // parse events into rows (date + description)
  const parseEvents = (events: string[] = []) => {
    let rows: Array<{ date: string; desc: string }> = []

    for (const line of events) {
      if (!line?.trim()) continue
      
      // Match date patterns like:
      // "Nov 10, 2025 Mon" or "Dec 20 - 27, 2025 Sat-Sat" or "Feb 5 - 6, 2026 Thu - Fri"
      // Pattern: Month Day(s), Year DayName(s) Description
      const datePattern = /^([A-Z][a-z]{2}\s+\d{1,2}(?:\s*-\s*\d{1,2})?,\s*\d{4}\s+(?:[A-Z][a-z]{2}(?:\s*-\s*[A-Z][a-z]{2})?)?)\s+(.+)$/
      const match = line.match(datePattern)
      
      if (match) {
        const date = match[1].trim()
        const desc = match[2].trim()
        rows.push({ date, desc })
      } else {
        // Fallback: treat entire line as description if pattern doesn't match
        rows.push({ date: '', desc: line.trim() })
      }
    }

    return { rows }
  }

  const { rows } = parseEvents(calendar.events || [])
  
  // Use header and footer from calendar data (extracted from PDF)
  const header = calendar.header ? [calendar.header] : []
  const footer = calendar.footer || []

  // derive a friendly display title when the scraped `title` is generic like "Download PDF"
  const makeFriendlyTitle = (rawTitle: string, fallbackLines: string[], url?: string) => {
    const isGeneric = !rawTitle || /download\s*pdf/i.test(rawTitle)
    if (!isGeneric) return rawTitle

    // prefer the first header line if available
    if (fallbackLines && fallbackLines.length > 0) {
      // prefer any header line that explicitly mentions 'Academic Calendar'
      const acadLine = fallbackLines.find(l => /academic\s*calendar/i.test(l))
      const pick = acadLine || fallbackLines[0]
      if (pick && pick.trim()) {
        // try to extract a concise 'Academic Calendar ... (Period)' phrase from the line
        const cleaned = pick.replace(/^NOTE\s*[:\-]?\s*/i, '').trim()
        const acadMatch = cleaned.match(/(Academic\s+Calendar(?:\s+For\b|\s+for\b)?[^,\n\r\.]*(?:\([^)]*\))?)/i)
        let t = acadMatch ? acadMatch[1].trim() : cleaned
        // trim and cap length
        if (t.length > 140) t = t.slice(0, 137) + '...'
        return t
      }
    }

    // fallback: derive from filename in URL
    if (url) {
      try {
        const p = new URL(url).pathname.split('/').pop() || ''
        let t = decodeURIComponent(p).replace(/[-_]+/g, ' ').replace(/\.pdf$/i, '')
        if (t) return t.length > 60 ? t.slice(0, 57) + '...' : t
      } catch (e) {
        // ignore
      }
    }

    return rawTitle || 'Academic Calendar'
  }

  const displayTitle = makeFriendlyTitle(calendar.title, header, calendar.url)

  // produce a compact, user-friendly short title similar to the screenshot
  const simplifyTitle = (t: string) => {
    if (!t) return t
    let s = t.replace(/\s+/g, ' ').trim()

    // remove university name
    s = s.replace(/United\s+International\s+University\s*/i, '')

    // strip leading NOTE markers
    s = s.replace(/^NOTE\s*[:\-]?\s*/i, '')

    // extract parenthetical period like (Fall 2025 Trimester) if present
    const paren = s.match(/\(([^)]+)\)/)
    let parenText = ''
    if (paren) {
      parenText = paren[1].trim()
      s = s.replace(/\([^)]*\)/, '').trim()
    }

    // remove the words 'Academic Calendar' and verbs like 'Revised' and 'For'
    s = s.replace(/Academic\s+Calendar/ig, '')
    s = s.replace(/Revised/ig, '[Revised]')
    s = s.replace(/\bFor\b\s*/ig, '')

    // collapse repeated words and trim
    s = s.replace(/\s+/g, ' ').trim()

    // if there is a program keyword, append parenthetical before it if that matches style
    if (parenText && /Undergraduate|Graduate|Pharmacy|Programs|Semester|Trimester/i.test(s)) {
      // put paren first (e.g., 'Fall 2025 Trimester Undergraduate Programs')
      return `${parenText} ${s}`.replace(/\s+/g, ' ').trim()
    }

    // otherwise append parenthetical at end
    if (parenText) return `${s} ${parenText}`.trim()

    return s
  }

  const shortTitle = simplifyTitle(displayTitle)

  return (
    <article className="card rounded-lg overflow-hidden">
      {/* Collapsed header bar (orange) - click to toggle */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen(o => !o) }}
        className="w-full flex items-center justify-between px-4 py-4 cursor-pointer"
        style={{ background: 'var(--primary)', color: 'white' }}
      >
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="h-8 w-8 rounded-sm object-contain" />
          ) : null}
          <div className="text-lg font-semibold" title={displayTitle}>{shortTitle}</div>
        </div>

        <div className="flex items-center gap-3">
          {/* Download button on right side (visible always) */}
          <a
            href={calendar.url}
            target="_blank"
            rel="noreferrer"
            className="download-btn"
            onClick={(e) => e.stopPropagation()}
            title={`Download ${displayTitle}`}
          >
            <PdfIcon className="inline-block mr-1" />
            <span className="sr-only">Download PDF</span>
          </a>

          <div className={`chev ${open ? 'open' : ''}`} aria-hidden>
            <ChevronRight />
          </div>
        </div>
      </div>

      <div className="p-4 mt-0 text-sm">
        {open ? (
          <div className="space-y-3 expand-wrap open">
            {/* header paragraphs (above the boxed schedule) */}
            {header && header.length > 0 && (
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                {header.map((h, i) => (
                  <div key={`h-${i}`}>{h}</div>
                ))}
              </div>
            )}

            {/* boxed schedule */}
            {rows && rows.length > 0 && (
              <div className="card p-3">
                <div className="grid grid-cols-12 gap-2">
                  {rows.map((r, i) => (
                    <div key={`r-${i}`} className="col-span-12 md:col-span-12 lg:col-span-12 p-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
                      <div className="flex items-start gap-3">
                        <div className="w-36 text-xs font-semibold pill" style={{ background: 'rgba(255,122,24,0.06)', color: 'var(--primary)' }}>{r.date}</div>
                        <div className="flex-1 text-sm leading-tight">{r.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* footer paragraphs (below the boxed schedule) */}
            {footer && footer.length > 0 && (
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                {footer.map((f, i) => (
                  <div key={`f-${i}`}>{f}</div>
                ))}
              </div>
            )}

            {/* notes section (additional information like payment details, etc.) */}
            {calendar.notes && calendar.notes.length > 0 && (
              <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(246, 139, 31, 0.08)', border: '1px solid rgba(246, 139, 31, 0.2)' }}>
                <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--primary)' }}>Important Notes</h4>
                <div className="space-y-2">
                  {calendar.notes.map((note, i) => (
                    <div key={`note-${i}`} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <ul className="space-y-1">
            {firstLines.map((e, i) => (
              <li key={i} className="text-sm text-gray-600 dark:text-gray-300">{e}</li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}
