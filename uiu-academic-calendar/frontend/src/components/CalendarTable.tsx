import React from 'react'

type CalendarTableProps = {
  title: string
  events: string[]
  footer?: string[]
  downloadUrl: string
}

export default function CalendarTable({ title, events, footer, downloadUrl }: CalendarTableProps) {
  // Parse event string: "Nov 8, 2025 Sat Classes Begin"
  const parseEvent = (eventStr: string) => {
    // Try to extract date and day
    const match = eventStr.match(/^([A-Z][a-z]{2}\s+\d{1,2}(?:-\d{1,2})?,\s+\d{4})\s+([A-Z][a-z]{2}(?:-[A-Z][a-z]{2})?)\s+(.+)$/i)
    if (match) {
      return {
        date: match[1], // "Nov 8, 2025" or "Nov 8-10, 2025"
        day: match[2],  // "Sat" or "Sat-Mon"
        description: match[3]
      }
    }
    // Fallback for events without proper format
    return {
      date: '',
      day: '',
      description: eventStr
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3">
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold text-sm">Date</th>
              <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold text-sm">Day</th>
              <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold text-sm">Event Description</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, idx) => {
              const { date, day, description } = parseEvent(event)
              return (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-orange-600 dark:text-orange-400 font-medium whitespace-nowrap">
                    {date}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-center">
                    {day}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm">
                    {description}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Notes */}
      {footer && footer.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
          <h3 className="font-semibold text-sm mb-2">Additional Information:</h3>
          <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
            {footer.map((note, idx) => (
              <li key={idx}>• {note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Download Button */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 text-center">
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download PDF
        </a>
      </div>
    </div>
  )
}
