import { useEffect, useRef } from 'react'
import { useEventLog } from '../context/EventLogContext'

export function EventLog() {
  const { entries } = useEventLog()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [entries])

  return (
    <div className="event-log" ref={ref}>
      {entries.length === 0 && (
        <span className="event-log-empty">Events will appear here when you interact with the system.</span>
      )}
      {entries.map(e => (
        <div key={e.id} className={`event-log-entry ${e.level}`}>
          <span className="el-ts">{new Date(e.ts).toLocaleTimeString()}</span>
          <span className="el-msg">{e.message}</span>
        </div>
      ))}
    </div>
  )
}
