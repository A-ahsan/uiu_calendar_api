import React, { Fragment } from 'react'
import type { CalEvent, Category } from '../utils/calendar'
import { statusOf, relative, dateTile, CATEGORY_META, MONTH_LONG } from '../utils/calendar'

function EventRow({ e, today }: { e: CalEvent; today: Date }) {
  const st = statusOf(e, today)
  const tile = dateTile(e)
  const rel = relative(e, today)
  return (
    <article className={`ev cat-${e.category}${st === 'past' ? ' past' : ''}${st === 'today' || st === 'ongoing' ? ' now' : ''}`}>
      <div className="tile" aria-hidden="true">
        <b className={tile.top.length > 5 ? 'long' : ''}>{tile.top}</b>
        <span>{tile.bottom}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <h4>{e.title}</h4>
        <div className="meta">
          <span className="cat">{CATEGORY_META[e.category].label}</span>
          {(e.dayText || e.dateText) && <span title={e.dateText}>{e.dayText || e.dateText}{e.start && e.start.getFullYear() !== e.end?.getFullYear() ? ` · ${e.dateText}` : ''}</span>}
          {rel && <span className="rel">{rel}</span>}
          {st === 'past' && <span>Done</span>}
        </div>
        {e.footnote && <div className="foot"><b>{'*'.repeat(Math.min(e.marks, 5))}</b>{e.footnote}</div>}
      </div>
    </article>
  )
}

/** Events grouped by month, with an optional "today" divider and collapsed past events. */
export default function Timeline({ events, today, filter, showPast, onShowPast, current }: {
  events: CalEvent[]; today: Date; filter: Category | 'all'; showPast: boolean; onShowPast: () => void; current: boolean
}) {
  const list = events.filter(e => filter === 'all' || e.category === filter)
  const pastCount = current ? list.filter(e => statusOf(e, today) === 'past').length : 0
  const visible = current && !showPast ? list.filter(e => statusOf(e, today) !== 'past') : list
  if (!list.length) return <div className="empty">No {filter === 'all' ? '' : CATEGORY_META[filter].plural.toLowerCase() + ' '}dates in this calendar.</div>

  const groups: { key: string; label: string; items: CalEvent[] }[] = []
  for (const e of visible) {
    const key = e.start ? `${e.start.getFullYear()}-${e.start.getMonth()}` : 'none'
    const label = e.start ? `${MONTH_LONG[e.start.getMonth()]} ${e.start.getFullYear()}` : 'Other dates'
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(e)
    else groups.push({ key, label, items: [e] })
  }
  const firstLive = current && showPast ? visible.find(e => statusOf(e, today) !== 'past') : undefined

  return (
    <div>
      {pastCount > 0 && !showPast && (
        <button className="show-past" onClick={onShowPast}>Show {pastCount} earlier {pastCount === 1 ? 'date' : 'dates'}</button>
      )}
      {groups.map(g => (
        <Fragment key={g.key}>
          <h3 className="month">{g.label}</h3>
          <div className="events">
            {g.items.map(e => (
              <Fragment key={e.id}>
                {e === firstLive && pastCount > 0 && <div className="today-line" role="separator">Today</div>}
                <EventRow e={e} today={today} />
              </Fragment>
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  )
}
