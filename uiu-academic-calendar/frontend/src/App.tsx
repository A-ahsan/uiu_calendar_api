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
          <div>
            <ThemeToggle dark={dark} toggle={() => setDark(d => !d)} />
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
