import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

interface Position {
  x: number
  y: number
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

// ── CAP Controls ──────────────────────────────────────────────────────────────

const MODES = [
  { key: 'normal', label: 'Normal', desc: 'Both backends publish to Redis — markers stay in sync' },
  { key: 'AP',     label: 'AP — Stay Available', desc: 'Partition active — backends accept writes but markers will diverge' },
  { key: 'CP',     label: 'CP — Stay Consistent', desc: 'Partition active — backends reject writes to preserve consistency' },
] as const

function CAPControls({ mode, onChange }: { mode: string; onChange: (m: 'normal' | 'AP' | 'CP') => void }) {
  const active = MODES.find(m => m.key === mode)
  return (
    <div className="cap-bar">
      <div className="cap-btns">
        {MODES.map(m => (
          <button key={m.key} className={`cap-btn${mode === m.key ? ' active' : ''}`} onClick={() => onChange(m.key as 'normal' | 'AP' | 'CP')}>
            {m.label}
          </button>
        ))}
      </div>
      <p className="cap-desc">{active?.desc}</p>
    </div>
  )
}

// ── Position Box ──────────────────────────────────────────────────────────────

interface BoxProps {
  label: string
  badge: string
  wsUrl: string
  restUrl: string
  capMode: 'normal' | 'AP' | 'CP'
}

function PositionBox({ label, badge, wsUrl, restUrl, capMode }: BoxProps) {
  const [pos, setPos] = useState<Position | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const persist = useCallback(async (p: Position) => {
    await fetch(restUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    })
  }, [restUrl])

  const persistDebounced = useDebounced(persist, 10)

  const toNormalized = useCallback((clientX: number, clientY: number): Position => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = clamp((clientX - rect.left) / rect.width * 2 - 1, -1, 1)
    const y = clamp((clientY - rect.top) / rect.height * 2 - 1, -1, 1)
    return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 }
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (capMode === 'CP') return
    e.preventDefault()
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
  }, [capMode, toNormalized, persistDebounced])

  useEffect(() => {
    fetch(restUrl)
      .then(r => r.json())
      .then(d => {
        if (d) setPos({ x: d.x, y: d.y })
      })
      .catch(() => setPos({ x: 0, y: 0 }))
  }, [restUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const ws = new WebSocket(wsUrl)
    ws.onmessage = (e) => {
      if (dragging.current) return
      const data = JSON.parse(e.data) as { x: number; y: number }
      setPos({ x: data.x, y: data.y })
    }
    return () => ws.close()
  }, [wsUrl]) // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="box-canvas" ref={canvasRef}>
        <div className="crosshair-h" />
        <div className="crosshair-v" />
        {pos && <div className={`marker ${badge}`} style={{ left, top }} onMouseDown={onMouseDown} />}
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [capMode, setCapMode] = useState<'normal' | 'AP' | 'CP'>('normal')

  async function applyMode(mode: 'normal' | 'AP' | 'CP') {
    const body = mode === 'normal'
      ? { active: false, mode: 'AP' }
      : { active: true, mode }
    await Promise.all([
      fetch('http://localhost:3001/admin/partition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      fetch('http://localhost:8000/admin/partition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    ])
    setCapMode(mode)
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="logo">Over<span>·</span>Engineering</div>
        <nav>
          <a href="#" className="active">App</a>
          <a href="#">About</a>
        </nav>
      </header>
      <CAPControls mode={capMode} onChange={applyMode} />
      <main className="main">
        <PositionBox
          label="TypeScript"
          badge="ts"
          wsUrl="ws://localhost:3001/ws"
          restUrl="http://localhost:3001/position"
          capMode={capMode}
        />
        <PositionBox
          label="Python"
          badge="py"
          wsUrl="ws://localhost:8000/ws"
          restUrl="http://localhost:8000/position"
          capMode={capMode}
        />
      </main>
    </div>
  )
}
