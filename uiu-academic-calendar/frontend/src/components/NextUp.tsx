import React from 'react'
import type { Term } from '../utils/calendar'
import { statusOf, relative, daysBetween, fmtDate, CATEGORY_META } from '../utils/calendar'

/** What's happening now / next in the selected term. */
export default function NextUp({ term, today, newest, onOpen }: { term: Term; today: Date; newest?: Term; onOpen: (t: Term) => void }) {
  const live = term.events.filter(e => e.start && statusOf(e, today) !== 'past')
  if (!live.length) {
    return (
      <div className="ended">
        <p><b>This {term.unit.toLowerCase()} has ended.</b> <span className="muted">Every date below is in the past.</span></p>
        {newest && newest.id !== term.id && <button className="btn primary" onClick={() => onOpen(newest)}>Open {newest.season} {newest.year}</button>}
      </div>
    )
  }
  const sorted = [...live].sort((a, b) => a.start!.getTime() - b.start!.getTime())
  const main = sorted.find(e => statusOf(e, today) !== 'upcoming') || sorted[0]
  const rest = sorted.filter(e => e !== main).slice(0, 3)
  const st = statusOf(main, today)
  const days = st === 'upcoming' ? daysBetween(today, main.start!) : st === 'ongoing' ? daysBetween(today, main.end!) : 0
  const range = main.start!.getTime() === main.end!.getTime() ? fmtDate(main.start!) : `${fmtDate(main.start!)} – ${fmtDate(main.end!)}`

  return (
    <section className="next" aria-label="Coming up">
      <div className="next-main">
        <div style={{ minWidth: 0 }}>
          <div className="when">{st === 'upcoming' ? 'Next up' : 'Happening now'}</div>
          <h3>{main.title}</h3>
          <p>{range} · {CATEGORY_META[main.category].label}</p>
        </div>
        <div className="countdown" aria-label={relative(main, today)}>
          {st === 'upcoming' ? <><b>{days}</b><span>{days === 1 ? 'day to go' : 'days to go'}</span></>
            : st === 'ongoing' ? <><b>{days}</b><span>{days === 1 ? 'day left' : 'days left'}</span></>
            : <><b>Today</b><span>&nbsp;</span></>}
        </div>
      </div>
      {rest.length > 0 && (
        <div className="next-list">
          {rest.map(e => (
            <div key={e.id} className={`cat-${e.category}`}><i /><b>{e.title}</b><span>{relative(e, today)}</span></div>
          ))}
        </div>
      )}
    </section>
  )
}
