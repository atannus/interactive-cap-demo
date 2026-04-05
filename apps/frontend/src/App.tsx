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

// ── TS box: draggable, writes to NestJS REST ──────────────────────────────────

function TsBox() {
  const [pos, setPos] = useState<Position>({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const persist = useCallback(async (p: Position) => {
    await fetch('http://localhost:3001/position/ts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    })
  }, [])

  const persistDebounced = useDebounced(persist, 80)

  const toNormalized = useCallback((clientX: number, clientY: number): Position => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = clamp((clientX - rect.left) / rect.width * 2 - 1, -1, 1)
    const y = clamp((clientY - rect.top) / rect.height * 2 - 1, -1, 1)
    return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 }
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
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
  }, [toNormalized, persistDebounced])

  const left = `${(pos.x + 1) / 2 * 100}%`
  const top  = `${(pos.y + 1) / 2 * 100}%`

  return (
    <div className="position-box">
      <div className="box-header">
        <span className="box-badge ts">TypeScript</span>
        <span className="box-title">NestJS</span>
        <span className="box-coords">{pos.x.toFixed(3)}, {pos.y.toFixed(3)}</span>
      </div>
      <div className="box-canvas" ref={canvasRef}>
        <div className="crosshair-h" />
        <div className="crosshair-v" />
        <div className="marker" style={{ left, top }} onMouseDown={onMouseDown} />
      </div>
    </div>
  )
}

// ── Python box: read-only, driven by FastAPI WebSocket ────────────────────────

function PyBox() {
  const [pos, setPos] = useState<Position>({ x: 0, y: 0 })

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws')
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data) as { x: number; y: number }
      setPos({ x: data.x, y: data.y })
    }
    return () => ws.close()
  }, [])

  const left = `${(pos.x + 1) / 2 * 100}%`
  const top  = `${(pos.y + 1) / 2 * 100}%`

  return (
    <div className="position-box">
      <div className="box-header">
        <span className="box-badge py">Python</span>
        <span className="box-title">FastAPI</span>
        <span className="box-coords">{pos.x.toFixed(3)}, {pos.y.toFixed(3)}</span>
      </div>
      <div className="box-canvas">
        <div className="crosshair-h" />
        <div className="crosshair-v" />
        <div className="marker passive" style={{ left, top }} />
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <div className="layout">
      <header className="header">
        <div className="logo">Over<span>·</span>Engineering</div>
        <nav>
          <a href="#" className="active">App</a>
          <a href="#">About</a>
        </nav>
      </header>
      <main className="main">
        <TsBox />
        <PyBox />
      </main>
    </div>
  )
}
