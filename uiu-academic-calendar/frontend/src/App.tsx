import React, { useEffect, useMemo, useState } from 'react'
import ThemeToggle from './components/ThemeToggle'
import MotivationalQuote from './components/MotivationalQuote'
import NextUp from './components/NextUp'
import SubscribeDialog from './components/SubscribeDialog'
import Timeline from './components/Timeline'
import { Icon } from './components/icons'
import {
  buildTerms, pickDefaultTerm, statusOf, termLabel, fmtDate, PROGRAMS, CATEGORY_META, startOfDay,
  type RawCalendar, type Term, type Program, type Category,
} from './utils/calendar'
import { downloadIcs } from './utils/ics'
import { downloadPdf } from './utils/pdf'

const SOURCE = 'https://www.uiu.ac.bd/academics/calendar/'

// Selected program/term live in the address (?program=ug&term=fall-2026-ug) so links can be shared
function readQuery() {
  const q = new URLSearchParams(window.location.search)
  return { program: q.get('program') as Program | null, term: q.get('term') }
}
function writeQuery(program: Program, term: string) {
  const q = new URLSearchParams({ program, term })
  window.history.replaceState(null, '', `${window.location.pathname}?${q}`)
}

export default function App() {
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [program, setProgram] = useState<Program>('ug')
  const [termId, setTermId] = useState<string>('')
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [showPast, setShowPast] = useState(false)
  const [busy, setBusy] = useState(false)
  const [subOpen, setSubOpen] = useState(false)
  const today = useMemo(() => startOfDay(new Date()), [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1a1817' : '#ffffff')
  }, [dark])
  // Saved only when the student taps the toggle; until then the site follows the phone/PC setting
  function toggleTheme() {
    setDark(d => {
      try { localStorage.setItem('dark', d ? '0' : '1') } catch {}
      return !d
    })
  }

  useEffect(() => {
    fetch('/calendars.json', { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then(payload => {
        const raw: RawCalendar[] = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
        const built = buildTerms(raw)
        setTerms(built)
        const q = readQuery()
        const fromLink = built.find(t => t.id === q.term)
        const prog = fromLink?.program || (q.program && built.some(t => t.program === q.program) ? q.program : built.some(t => t.program === 'ug') ? 'ug' : built[0]?.program || 'ug')
        setProgram(prog)
        setTermId((fromLink || pickDefaultTerm(built, prog, new Date()))?.id || '')
      })
      .catch(err => { console.error('Failed to load calendars', err); setFailed(true) })
      .finally(() => setLoading(false))
  }, [])

  const programs = PROGRAMS.filter(p => terms.some(t => t.program === p.id))
  const programTerms = terms.filter(t => t.program === program)
  const term = terms.find(t => t.id === termId) || programTerms[0]
  const current = !!term && term.events.some(e => e.start && statusOf(e, today) !== 'past')
  const categories = useMemo(() => {
    const counts = new Map<Category, number>()
    term?.events.forEach(e => counts.set(e.category, (counts.get(e.category) || 0) + 1))
    return (Object.keys(CATEGORY_META) as Category[]).filter(c => counts.has(c)).map(c => ({ c, n: counts.get(c)! }))
  }, [term])

  useEffect(() => { if (term) writeQuery(term.program, term.id) }, [term])

  function chooseProgram(p: Program) {
    setProgram(p)
    setTermId(pickDefaultTerm(terms, p, new Date())?.id || '')
    setFilter('all'); setShowPast(false)
  }
  function chooseTerm(t: Term) {
    setProgram(t.program); setTermId(t.id)
    setFilter('all'); setShowPast(false)
  }
  const tag = (t: Term) => {
    if (!t.start || !t.end) return null
    if (t.start > today) return <small className="next">Next</small>
    if (t.end >= today) return <small className="now">Now</small>
    return null
  }
  async function pdf() {
    if (!term) return
    setBusy(true)
    try { await downloadPdf(term) } catch (e) { console.error(e); alert('Could not create the PDF. Please try again.') } finally { setBusy(false) }
  }

  return (
    <>
      <header className="app-header">
        <div className="wrap">
          <a href="/" className="logo" aria-label="UIU Academic Calendar home"><span className="logo-mark">UIU</span><span>Academic Calendar</span></a>
          <span className="spacer" />
          <a className="hdr-link" href="https://uiu-faculty-reviewer.vercel.app/" target="_blank" rel="noopener noreferrer" title="UIU Faculty Reviewer (opens in a new tab)">
            <Icon.ext /><span>Faculty Reviewer</span>
          </a>
          <ThemeToggle dark={dark} toggle={toggleTheme} />
        </div>
      </header>

      <main className="wrap">
        <section className="hero">
          <p className="eyebrow">United International University</p>
          <h1>Academic Calendar</h1>
          <p>Registration, classes, exams, payments and holidays — always up to date with uiu.ac.bd.</p>
          <div className="today-pill"><i />Today is {fmtDate(today)}</div>
        </section>

        {loading ? (
          <div style={{ display: 'grid', gap: 12, marginTop: 24 }} aria-busy="true">
            <div className="skel" style={{ height: 44, width: 320, maxWidth: '100%' }} />
            <div className="skel" style={{ height: 120 }} />
            <div className="skel" style={{ height: 76 }} /><div className="skel" style={{ height: 76 }} />
          </div>
        ) : failed || !term ? (
          <div className="empty" style={{ marginTop: 24 }}>
            Couldn’t load the calendar right now. Check your connection, or see the <a href={SOURCE} target="_blank" rel="noopener noreferrer">official UIU calendar</a>.
          </div>
        ) : (
          <>
            <div className="pickers">
              {programs.length > 1 && (
                <div className="seg" role="group" aria-label="Program">
                  {programs.map(p => <button key={p.id} aria-pressed={program === p.id} onClick={() => chooseProgram(p.id)}>{p.label}</button>)}
                </div>
              )}
              <div className="chips" role="group" aria-label="Term">
                {programTerms.map(t => (
                  <button key={t.id} className="chip" aria-pressed={t.id === term.id} onClick={() => chooseTerm(t)}>{termLabel(t)}{tag(t)}</button>
                ))}
              </div>
            </div>

            <div className="term-head">
              <div style={{ minWidth: 0 }}>
                <h2>{term.season} {term.year} {term.unit}{term.revised && <span className="badge">Revised</span>}</h2>
                <p>{PROGRAMS.find(p => p.id === term.program)?.label}{term.program === 'pharm' ? ' (Bachelor of Pharmacy)' : ' Programs'} · {term.events.length} dates</p>
              </div>
              <div className="actions">
                <button className="btn primary" onClick={() => setSubOpen(true)} title="Keeps your calendar updated when UIU changes a date"><Icon.calPlus />Subscribe</button>
                <button className="btn" onClick={() => downloadIcs(term)} title="Download a one-time copy (.ics). It won't update by itself."><Icon.calPlus />Add once</button>
                <button className="btn" onClick={pdf} disabled={busy}><Icon.pdf />{busy ? 'Preparing…' : 'PDF'}</button>
                <a className="btn" href={SOURCE} target="_blank" rel="noopener noreferrer" title="Official UIU page"><Icon.link />Official</a>
              </div>
            </div>

            <NextUp term={term} today={today} newest={pickDefaultTerm(terms, program, new Date())} onOpen={chooseTerm} />

            <div className="filters">
              <div className="chips" role="group" aria-label="Show">
                <button className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</button>
                {categories.map(({ c, n }) => (
                  <button key={c} className={`chip cat-${c}`} aria-pressed={filter === c} onClick={() => setFilter(f => (f === c ? 'all' : c))}>
                    <span className="dot" />{CATEGORY_META[c].plural}<small>{n}</small>
                  </button>
                ))}
              </div>
            </div>

            <Timeline events={term.events} today={today} filter={filter} showPast={showPast} onShowPast={() => setShowPast(true)} current={current} />

            {term.notes.length > 0 && (
              <details className="notes">
                <summary>Important notes ({term.notes.length})<Icon.chevron /></summary>
                <ul>{term.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
              </details>
            )}
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <span>Data from <a href={SOURCE} target="_blank" rel="noopener noreferrer">uiu.ac.bd</a>, checked weekly. Always confirm important dates with the university.</span>
          <span>Created by ViPeR · <a href="https://uiu-faculty-reviewer.vercel.app/" target="_blank" rel="noopener noreferrer">UIU Faculty Reviewer</a></span>
        </div>
      </footer>

      {subOpen && term && <SubscribeDialog term={term} onClose={() => setSubOpen(false)} />}
      <MotivationalQuote />
    </>
  )
}
