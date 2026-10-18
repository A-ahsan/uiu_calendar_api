import React from 'react'
import { Icon } from './icons'

type Props = { dark: boolean; toggle: () => void }

export default function ThemeToggle({ dark, toggle }: Props) {
  return (
    <button className="icon-btn" onClick={toggle} aria-pressed={dark} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>
      {dark ? <Icon.sun /> : <Icon.moon />}
    </button>
  )
}
