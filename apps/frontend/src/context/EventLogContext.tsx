import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { LogEntry, LogLevel } from '../types'

interface EventLogContextValue {
  entries: LogEntry[]
  addEvent: (message: string, level?: LogLevel) => void
}

const EventLogContext = createContext<EventLogContextValue | null>(null)

export function EventLogProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const logCounter = useRef(0)

  const addEvent = useCallback((message: string, level: LogLevel = 'info') => {
    setEntries(prev => [...prev, { id: logCounter.current++, ts: Date.now(), message, level }])
  }, [])

  return (
    <EventLogContext.Provider value={{ entries, addEvent }}>
      {children}
    </EventLogContext.Provider>
  )
}

export function useEventLog(): EventLogContextValue {
  const ctx = useContext(EventLogContext)
  if (!ctx) throw new Error('useEventLog must be used within EventLogProvider')
  return ctx
}
