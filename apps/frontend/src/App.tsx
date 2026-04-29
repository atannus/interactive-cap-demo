import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

interface Position {
  x: number
  y: number
}

interface LocalState {
  x: number
  y: number
  updated_at: string
  source: 'ts' | 'py'
}

type HealingHeuristic = 'lww' | 'ts-wins' | 'py-wins'
type CapMode = 'normal' | 'AP' | 'CP'
type LogLevel = 'info' | 'warn' | 'error' | 'success'

interface LogEntry {
  id: number
  ts: number
  message: string
  level: LogLevel
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function useDebounced<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return useCallback((...args: T) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), ms)
  }, [fn, ms])
}

function fmt(p: Position) {
  return `(${p.x.toFixed(3)}, ${p.y.toFixed(3)})`
}

// ── Event Log ─────────────────────────────────────────────────────────────────

function EventLog({ entries }: { entries: LogEntry[] }) {
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

// ── CAP Controls ──────────────────────────────────────────────────────────────

interface CAPControlsProps {
  capMode: CapMode
  healingHeuristic: HealingHeuristic
  partitionDuration: string
  onHeuristicChange: (h: HealingHeuristic) => void
  onDurationChange: (d: string) => void
  onTrigger: (mode: 'AP' | 'CP') => void
  onHeal: () => void
}

function CAPControls({
  capMode, healingHeuristic, partitionDuration,
  onHeuristicChange, onDurationChange, onTrigger, onHeal,
}: CAPControlsProps) {
  if (capMode !== 'normal') {
    return (
      <div className="cap-bar">
        <div className="cap-controls-row">
          <span className={`partition-banner ${capMode.toLowerCase()}`}>
            PARTITION ACTIVE / {capMode}
          </span>
          <button className="cap-btn heal" onClick={onHeal}>Heal Partition</button>
          <span className="cap-heuristic-label">
            on heal: {healingHeuristic === 'lww' ? 'last-write-wins' : healingHeuristic === 'ts-wins' ? 'NestJS wins' : 'FastAPI wins'}
          </span>
        </div>
        <p className="cap-desc">
          {capMode === 'AP'
            ? 'Replication suppressed — both backends accept writes and will diverge.'
            : 'Writes rejected on both backends — no divergence, no availability.'}
        </p>
      </div>
    )
  }

  return (
    <div className="cap-bar">
      <div className="cap-controls-row">
        <label className="cap-label">Heal heuristic</label>
        <select
          className="cap-select"
          value={healingHeuristic}
          onChange={e => onHeuristicChange(e.target.value as HealingHeuristic)}
        >
          <option value="lww">Last-write-wins (timestamp)</option>
          <option value="ts-wins">NestJS always wins</option>
          <option value="py-wins">FastAPI always wins</option>
        </select>
        <label className="cap-label">Auto-heal after</label>
        <input
          className="cap-duration-input"
          type="number"
          min="1"
          placeholder="—"
          value={partitionDuration}
          onChange={e => onDurationChange(e.target.value)}
        />
        <span className="cap-label">s</span>
        <button className="cap-btn trigger-ap" onClick={() => onTrigger('AP')}>Trigger AP Partition</button>
        <button className="cap-btn trigger-cp" onClick={() => onTrigger('CP')}>Trigger CP Partition</button>
      </div>
      <p className="cap-desc">
        AP: both backends stay available, markers will diverge. CP: writes rejected, markers frozen.
      </p>
    </div>
  )
}

// ── Position Box ──────────────────────────────────────────────────────────────

interface BoxProps {
  label: string
  badge: string
  wsUrl: string
  restUrl: string
  capMode: CapMode
  onWriteResult: (accepted: boolean, pos: Position) => void
  onWsUpdate: (pos: Position) => void
}

function PositionBox({ label, badge, wsUrl, restUrl, capMode, onWriteResult, onWsUpdate }: BoxProps) {
  const [pos, setPos] = useState<Position | null>(null)
  const [rejected, setRejected] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const prevPos = useRef<Position | null>(null)

  const persist = useCallback(async (p: Position) => {
    try {
      const res = await fetch(restUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      })
      if (res.ok) {
        onWriteResult(true, p)
      } else {
        onWriteResult(false, p)
        setPos(prevPos.current)
        setRejected(true)
        setTimeout(() => setRejected(false), 400)
      }
    } catch {
      onWriteResult(false, p)
    }
  }, [restUrl, onWriteResult])

  const persistDebounced = useDebounced(persist, 10)

  const toNormalized = useCallback((clientX: number, clientY: number): Position => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = clamp((clientX - rect.left) / rect.width * 2 - 1, -1, 1)
    const y = clamp((clientY - rect.top) / rect.height * 2 - 1, -1, 1)
    return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 }
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    prevPos.current = pos
    dragging.current = true
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const p = toNormalized(e.clientX, e.clientY)
      setPos(p)
      persistDebounced(p)
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [pos, toNormalized, persistDebounced])

  useEffect(() => {
    fetch(restUrl)
      .then(r => r.json())
      .then(d => { if (d) setPos({ x: d.x, y: d.y }) })
      .catch(() => setPos({ x: 0, y: 0 }))
  }, [restUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const ws = new WebSocket(wsUrl)
    ws.onmessage = (e) => {
      if (dragging.current) return
      const data = JSON.parse(e.data) as { x: number; y: number }
      const p = { x: data.x, y: data.y }
      setPos(p)
      onWsUpdate(p)
    }
    return () => ws.close()
  }, [wsUrl, onWsUpdate]) // eslint-disable-line react-hooks/exhaustive-deps

  const left = pos ? `${(pos.x + 1) / 2 * 100}%` : '50%'
  const top  = pos ? `${(pos.y + 1) / 2 * 100}%` : '50%'

  return (
    <div className="position-box">
      <div className="box-header">
        <span className={`box-badge ${badge}`}>{label}</span>
        <span className="box-title">{label === 'TypeScript' ? 'NestJS' : 'FastAPI'}</span>
        <span className="box-coords">{pos ? `${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}` : '…'}</span>
        {capMode !== 'normal' && (
          <span className={`status-pill ${capMode.toLowerCase()}`}>
            {capMode === 'AP' ? 'PARTITIONED / AP' : 'PARTITIONED / CP'}
          </span>
        )}
      </div>
      <div className={`box-canvas${rejected ? ' rejected-flash' : ''}`} ref={canvasRef}>
        <div className="crosshair-h" />
        <div className="crosshair-v" />
        {pos && <div className={`marker ${badge}`} style={{ left, top }} onMouseDown={onMouseDown} />}
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

const TS_REST = 'http://localhost:3001'
const PY_REST = 'http://localhost:8000'

export default function App() {
  const [capMode, setCapMode] = useState<CapMode>('normal')
  const [healingHeuristic, setHealingHeuristic] = useState<HealingHeuristic>('lww')
  const [partitionDuration, setPartitionDuration] = useState('')
  const [eventLog, setEventLog] = useState<LogEntry[]>([])
  const logCounter = useRef(0)
  const autoHealTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addEvent = useCallback((message: string, level: LogLevel = 'info') => {
    setEventLog(prev => [...prev, { id: logCounter.current++, ts: Date.now(), message, level }])
  }, [])

  const onWriteResult = useCallback((backend: string) => (accepted: boolean, pos: Position) => {
    if (accepted) {
      addEvent(`Write accepted by ${backend}: ${fmt(pos)}`, 'info')
    } else {
      addEvent(`Write REJECTED by ${backend} (CP mode)`, 'error')
    }
  }, [addEvent])

  const onWsUpdate = useCallback((backend: string) => (pos: Position) => {
    addEvent(`Replication received by ${backend}: ${fmt(pos)}`, 'info')
  }, [addEvent])

  const onHeal = useCallback(async () => {
    if (autoHealTimer.current) {
      clearTimeout(autoHealTimer.current)
      autoHealTimer.current = null
    }
    addEvent('Heal initiated — reading local state from both backends', 'info')

    const [tsRes, pyRes] = await Promise.all([
      fetch(`${TS_REST}/admin/local-state`).then(r => r.json()) as Promise<LocalState | null>,
      fetch(`${PY_REST}/admin/local-state`).then(r => r.json()) as Promise<LocalState | null>,
    ])

    let winner: LocalState | null = null
    if (!tsRes && !pyRes) {
      addEvent('Both backends returned no state — nothing to reconcile', 'warn')
    } else if (!tsRes) {
      winner = pyRes
      addEvent('NestJS has no state — FastAPI wins by default', 'warn')
    } else if (!pyRes) {
      winner = tsRes
      addEvent('FastAPI has no state — NestJS wins by default', 'warn')
    } else {
      const tsT = new Date(tsRes.updated_at).getTime()
      const pyT = new Date(pyRes.updated_at).getTime()
      if (healingHeuristic === 'lww') {
        winner = tsT >= pyT ? tsRes : pyRes
        const winnerName = tsT >= pyT ? 'NestJS' : 'FastAPI'
        addEvent(
          `LWW: NestJS ts=${tsRes.updated_at.slice(11, 23)} vs FastAPI ts=${pyRes.updated_at.slice(11, 23)} — ${winnerName} wins`,
          'success',
        )
      } else if (healingHeuristic === 'ts-wins') {
        winner = tsRes
        addEvent('Heuristic: NestJS wins', 'success')
      } else {
        winner = pyRes
        addEvent('Heuristic: FastAPI wins', 'success')
      }
    }

    await Promise.all([
      fetch(`${TS_REST}/admin/partition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: false, mode: 'AP' }) }),
      fetch(`${PY_REST}/admin/partition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: false, mode: 'AP' }) }),
    ])
    addEvent('Partition deactivated on both backends', 'info')

    if (winner) {
      const winnerUrl = winner.source === 'ts' ? `${TS_REST}/position` : `${PY_REST}/position`
      const winnerName = winner.source === 'ts' ? 'NestJS' : 'FastAPI'
      await fetch(winnerUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: winner.x, y: winner.y }),
      })
      addEvent(`Reconciled ${fmt(winner)} applied to ${winnerName} — replication propagating`, 'success')
    }

    setCapMode('normal')
  }, [healingHeuristic, addEvent])

  const onTrigger = useCallback(async (mode: 'AP' | 'CP') => {
    await Promise.all([
      fetch(`${TS_REST}/admin/partition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: true, mode }) }),
      fetch(`${PY_REST}/admin/partition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: true, mode }) }),
    ])
    setCapMode(mode)
    addEvent(
      mode === 'AP'
        ? 'AP partition triggered — replication suppressed, both backends accept writes'
        : 'CP partition triggered — writes rejected on both backends',
      'warn',
    )

    const secs = parseInt(partitionDuration, 10)
    if (!isNaN(secs) && secs > 0) {
      addEvent(`Auto-heal scheduled in ${secs}s`, 'info')
      autoHealTimer.current = setTimeout(onHeal, secs * 1000)
    }
  }, [partitionDuration, addEvent, onHeal])

  const tsWriteResult = useCallback(onWriteResult('NestJS'), [onWriteResult])
  const pyWriteResult = useCallback(onWriteResult('FastAPI'), [onWriteResult])
  const tsWsUpdate   = useCallback(onWsUpdate('NestJS'), [onWsUpdate])
  const pyWsUpdate   = useCallback(onWsUpdate('FastAPI'), [onWsUpdate])

  return (
    <div className="layout">
      <header className="header">
        <div className="logo">Over<span>·</span>Engineering</div>
        <nav>
          <a href="#" className="active">App</a>
          <a href="#">About</a>
        </nav>
      </header>
      <CAPControls
        capMode={capMode}
        healingHeuristic={healingHeuristic}
        partitionDuration={partitionDuration}
        onHeuristicChange={setHealingHeuristic}
        onDurationChange={setPartitionDuration}
        onTrigger={onTrigger}
        onHeal={onHeal}
      />
      <main className="main">
        <PositionBox
          label="TypeScript"
          badge="ts"
          wsUrl="ws://localhost:3001/ws"
          restUrl={`${TS_REST}/position`}
          capMode={capMode}
          onWriteResult={tsWriteResult}
          onWsUpdate={tsWsUpdate}
        />
        <PositionBox
          label="Python"
          badge="py"
          wsUrl="ws://localhost:8000/ws"
          restUrl={`${PY_REST}/position`}
          capMode={capMode}
          onWriteResult={pyWriteResult}
          onWsUpdate={pyWsUpdate}
        />
      </main>
      <EventLog entries={eventLog} />
    </div>
  )
}
