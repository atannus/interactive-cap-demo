import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './App.css'
import { EventLogProvider } from './context/EventLogContext'
import { PartitionProvider } from './context/PartitionContext'
import { CAPControls } from './components/CAPControls'
import { PositionBox } from './components/PositionBox'
import { EventLog } from './components/EventLog'
import { AboutPage } from './components/AboutPage'
import { TS_REST, PY_REST } from './lib/config'

export default function App() {
  const { pathname } = useLocation()
  const isAbout = pathname === '/about'

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
          </header>
          {isAbout ? (
            <AboutPage />
          ) : (
            <>
              <CAPControls />
              <main className="main">
                <PositionBox
                  label="TypeScript"
                  badge="ts"
                  wsUrl="ws://localhost:3001/ws"
                  restUrl={`${TS_REST}/position`}
                />
                <PositionBox
                  label="Python"
                  badge="py"
                  wsUrl="ws://localhost:8000/ws"
                  restUrl={`${PY_REST}/position`}
                />
              </main>
              <EventLog />
            </>
          )}
        </div>
      </PartitionProvider>
    </EventLogProvider>
  )
}
