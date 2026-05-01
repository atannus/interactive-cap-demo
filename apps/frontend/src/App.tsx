import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './App.css'
import type { Theme } from './types'
import { EventLogProvider } from './context/EventLogContext'
import { PartitionProvider } from './context/PartitionContext'
import { ThemeToggle } from './components/ThemeToggle'
import { CAPControls } from './components/CAPControls'
import { PositionBox } from './components/PositionBox'
import { EventLog } from './components/EventLog'
import { InfoPane } from './components/InfoPane'
import { AboutPage } from './components/AboutPage'
import { TS_REST, PY_REST, TS_WS, PY_WS } from './lib/config'

export default function App() {
  const { pathname } = useLocation()
  const isAbout = pathname === '/about'

  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme | null) ?? 'system'
  )

  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('theme-dark', 'theme-light')
    if (theme === 'dark') html.classList.add('theme-dark')
    else if (theme === 'light') html.classList.add('theme-light')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.classList.toggle('about-view', isAbout)
    return () => document.documentElement.classList.remove('about-view')
  }, [isAbout])

  return (
    <EventLogProvider>
      <PartitionProvider>
        <div className="layout">
          <header className="header">
            <div className="logo-group">
              <div className="logo">Interactive<span>·</span>Cap<span>·</span>Demo</div>
              <span className="logo-byline">by Andre Tannus</span>
            </div>
            <nav>
              <Link to="/" className={!isAbout ? 'active' : ''}>App</Link>
              <Link to="/about" className={isAbout ? 'active' : ''}>About</Link>
            </nav>
            <ThemeToggle theme={theme} onChange={setTheme} />
          </header>
          {isAbout ? (
            <AboutPage />
          ) : (
            <>
              <CAPControls />
              <div className="workspace">
                <main className="main">
                  <PositionBox
                    badge="ts"
                    wsUrl={`${TS_WS}/ws`}
                    restUrl={`${TS_REST}/position`}
                  />
                  <PositionBox
                    badge="py"
                    wsUrl={`${PY_WS}/ws`}
                    restUrl={`${PY_REST}/position`}
                  />
                </main>
                <InfoPane />
              </div>
              <EventLog />
            </>
          )}
        </div>
      </PartitionProvider>
    </EventLogProvider>
  )
}
