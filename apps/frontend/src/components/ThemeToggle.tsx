import type { Theme } from '../types'

interface ThemeToggleProps {
  theme: Theme
  onChange: (t: Theme) => void
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function MonitorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      <button
        className={`theme-btn${theme === 'light' ? ' active' : ''}`}
        onClick={() => onChange('light')}
        title="Light theme"
        aria-pressed={theme === 'light'}
      >
        <SunIcon />
      </button>
      <button
        className={`theme-btn${theme === 'dark' ? ' active' : ''}`}
        onClick={() => onChange('dark')}
        title="Dark theme"
        aria-pressed={theme === 'dark'}
      >
        <MoonIcon />
      </button>
      <button
        className={`theme-btn${theme === 'system' ? ' active' : ''}`}
        onClick={() => onChange('system')}
        title="System theme"
        aria-pressed={theme === 'system'}
      >
        <MonitorIcon />
      </button>
    </div>
  )
}
