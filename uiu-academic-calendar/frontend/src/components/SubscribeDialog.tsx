import React, { useEffect, useState } from 'react'
import type { Term } from '../utils/calendar'
import { PROGRAMS, termLabel } from '../utils/calendar'
import { feedPath } from '../utils/ics'
import { Icon } from './icons'

/** "Subscribe": the calendar app keeps a live link to our feed, so UIU's changes reach the phone by themselves. */
export default function SubscribeDialog({ term, onClose }: { term: Term; onClose: () => void }) {
  const [scope, setScope] = useState<'program' | 'term'>('program')
  const [copied, setCopied] = useState(false)
  const program = PROGRAMS.find(p => p.id === term.program)!
  const path = scope === 'program' ? feedPath.program(term.program) : feedPath.term(term)
  const https = `${window.location.origin}${path}`
  const webcal = https.replace(/^https?:/, 'webcal:')
  const name = scope === 'program' ? `UIU ${program.label}` : `UIU ${termLabel(term)} (${program.label})`

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copy() {
    try { await navigator.clipboard.writeText(https); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { window.prompt('Copy this link', https) }
  }

  return (
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sub-title">
        <div className="sheet-head">
          <h3 id="sub-title">Subscribe to UIU dates</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon.close /></button>
        </div>
        <p className="muted" style={{ margin: 0 }}>Add it once. When UIU changes a date, your calendar updates by itself. No duplicates.</p>

        <div className="scope" role="radiogroup" aria-label="What to subscribe to">
          <label className={scope === 'program' ? 'on' : ''}>
            <input type="radio" name="scope" checked={scope === 'program'} onChange={() => setScope('program')} />
            <span><b>All {program.label} dates</b><small>Every trimester, and new ones appear automatically. Recommended.</small></span>
          </label>
          <label className={scope === 'term' ? 'on' : ''}>
            <input type="radio" name="scope" checked={scope === 'term'} onChange={() => setScope('term')} />
            <span><b>Only {termLabel(term)}</b><small>Just this {term.unit.toLowerCase()}.</small></span>
          </label>
        </div>

        <div className="sub-apps">
          <a className="btn" href={webcal}><Icon.calPlus /><span><b>Apple Calendar</b><small>iPhone, iPad, Mac</small></span></a>
          <a className="btn" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noopener noreferrer"><Icon.calPlus /><span><b>Google Calendar</b><small>Android and web</small></span></a>
          <a className="btn" href={`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(https)}&name=${encodeURIComponent(name)}`} target="_blank" rel="noopener noreferrer"><Icon.calPlus /><span><b>Outlook</b><small>Outlook.com, Windows</small></span></a>
        </div>

        <div className="copy-row">
          <input readOnly value={https} aria-label="Calendar link" onFocus={e => e.currentTarget.select()} />
          <button className="btn" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
        </div>

        <ul className="sub-notes">
          <li><b>Android:</b> the Google Calendar app can’t add a link itself. The Google button opens Google Calendar in your browser; after you add it there, it shows up in the app.</li>
          <li>Updates arrive within a few hours on iPhone and Outlook, and within about a day on Google Calendar.</li>
          <li>To stop, remove “{name}” from your calendar app’s list of calendars.</li>
        </ul>
      </div>
    </div>
  )
}
