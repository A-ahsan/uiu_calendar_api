import React from 'react'
import { Calendar } from '../App'
import CalendarCard from './CalendarCard'

export default function CalendarList({ calendars, logoUrl }: { calendars: Calendar[]; logoUrl: string }) {
  if (!calendars || calendars.length === 0) return <div className="py-8 text-center">No calendars found</div>

  return (
    <div className="space-y-6">
      {calendars.map((c, idx) => (
        <CalendarCard key={idx} calendar={c} logoUrl={logoUrl} />
      ))}
    </div>
  )
}
