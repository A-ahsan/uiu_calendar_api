import React, { useEffect, useState } from 'react'
import axios from 'axios'
import ThemeToggle from './components/ThemeToggle'
import MotivationalQuote from './components/MotivationalQuote'
import CalendarList from './components/CalendarList'

export type Calendar = {
  title: string
  url: string
  header?: string
  events: string[]
  footer?: string[]
  notes?: string[]
}

export default function App() {
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('dark') === '1' } catch { return false }
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem('dark', dark ? '1' : '0') } catch {}
  }, [dark])

  useEffect(() => {
    async function load() {
      try {
        // Fetch from the static calendars.json file in the public folder
        const res = await axios.get('/calendars.json')
        const payload = res.data
        
        // Handle both formats: array or { count, data }
        if (Array.isArray(payload)) {
          setCalendars(payload)
        } else if (payload && Array.isArray(payload.data)) {
          setCalendars(payload.data)
        } else {
          setCalendars([])
        }
      } catch (e) {
        console.error('Failed to fetch calendars', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const logoUrl = new URL('../logoo.png', import.meta.url).href

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto p-4">
        <header className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-2xl font-semibold"><span className="site-title">UIU Academic Calendar</span></h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">Official University Academic Calendars and Events</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle dark={dark} toggle={() => setDark(d => !d)} />

            {/* Link to companion site - UIU Faculty Reviewer */}
            <a
              href="https://uiu-faculty-reviewer.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 hover:shadow-sm transition"
              title="Open UIU Faculty Reviewer (new tab)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 3h6v6" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14L21 3" />
              </svg>
              <span>UIU Faculty Reviewer</span>
            </a>
          </div>
        </header>

        <main>
          {loading ? (
            <div className="py-16 text-center">Loading...</div>
          ) : (
            <CalendarList calendars={calendars} logoUrl={logoUrl} />
          )}
        </main>
        <footer className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Created by ViPeR
        </footer>
      </div>
      
      {/* Motivational quote popup */}
      <MotivationalQuote />
    </div>
  )
}
