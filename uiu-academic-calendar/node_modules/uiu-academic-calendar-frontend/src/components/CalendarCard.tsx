import React, { useState } from 'react'
import { Calendar } from '../App'
import { PdfIcon, ChevronRight } from './icons'

export default function CalendarCard({ calendar, logoUrl }: { calendar: Calendar; logoUrl?: string }) {
  const [open, setOpen] = useState(false)
  const firstLines = calendar.events?.slice(0, 4) || []

  // parse events into header, rows (date-like), footer
  const parseEvents = (events: string[] = []) => {
    const months = '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)'
    const isDateLine = (s: string) => new RegExp(months, 'i').test(s) || /^\d{1,2}[A-Za-z]{0,2}\b/.test(s)

    let header: string[] = []
    let rows: Array<{ date: string; desc: string }> = []
    let footer: string[] = []

    // find first and last indices of date-like lines
    let firstIdx = -1
    let lastIdx = -1
    for (let i = 0; i < events.length; i++) {
      if (isDateLine(events[i])) {
        if (firstIdx === -1) firstIdx = i
        lastIdx = i
      }
    }

    if (firstIdx === -1) {
      // no date-like lines: everything is header
      header = events.slice()
      return { header, rows, footer }
    }

    header = events.slice(0, firstIdx)
    footer = events.slice(lastIdx + 1)

    const middle = events.slice(firstIdx, lastIdx + 1)
    for (const line of middle) {
      // try to split date part and description
      // split on two or more spaces or '  ' or ' - ' between date and text
      let parts = line.split(/\s{2,}|\s-\s|\t/)
      if (parts.length === 1) {
        // try split after the year (e.g., 'Nov 8 - 10, 2025 Sat - Mon Course Advising & Registration')
        const m = line.match(/^(.*?\d{4}[\)\,:\-]*)\s+(.*)$/)
        if (m) parts = [m[1], m[2]]
      }

      const date = parts[0] || ''
      const desc = parts.slice(1).join(' ') || ''
      rows.push({ date: date.trim(), desc: desc.trim() || line })
    }

    return { header, rows, footer }
  }

  const { header, rows, footer } = parseEvents(calendar.events || [])

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
