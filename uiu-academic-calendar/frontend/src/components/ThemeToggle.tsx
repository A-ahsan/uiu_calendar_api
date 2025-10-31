import React from 'react'

type Props = { dark: boolean; toggle: () => void }

export default function ThemeToggle({ dark, toggle }: Props) {
  return (
    <button
      aria-pressed={dark}
      onClick={toggle}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } }}
      className={`relative w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        dark ? 'bg-gray-700' : 'bg-orange-400'
      }`}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span
        className={`inline-block w-6 h-6 rounded-full bg-white shadow transform transition-transform duration-300 ${
          dark ? 'translate-x-6' : 'translate-x-0'
        } flex items-center justify-center`}
      >
        {dark ? (
          <svg className="w-4 h-4 text-gray-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            {/* central sun */}
            <circle cx="12" cy="12" r="4" fill="#F6C431" />
            {/* small dots/rays around the sun */}
            <circle cx="12" cy="3.5" r="0.9" fill="#F6C431" />
            <circle cx="12" cy="20.5" r="0.9" fill="#F6C431" />
            <circle cx="3.5" cy="12" r="0.9" fill="#F6C431" />
            <circle cx="20.5" cy="12" r="0.9" fill="#F6C431" />
            <circle cx="5.5" cy="5.5" r="0.9" fill="#F6C431" />
            <circle cx="18.5" cy="5.5" r="0.9" fill="#F6C431" />
            <circle cx="5.5" cy="18.5" r="0.9" fill="#F6C431" />
            <circle cx="18.5" cy="18.5" r="0.9" fill="#F6C431" />
          </svg>
        )}
      </span>
    </button>
  )
}
