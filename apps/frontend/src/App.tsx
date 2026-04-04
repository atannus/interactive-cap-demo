import { useCallback, useRef, useState } from 'react'
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

interface PositionBoxProps {
  lang: 'ts' | 'py'
  title: string
  boxId: string
  apiBase: string
}

function PositionBox({ lang, title, boxId, apiBase }: PositionBoxProps) {
  const [pos, setPos] = useState<Position>({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const persist = useCallback(async (p: Position) => {
    await fetch(`${apiBase}/position/${boxId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    })
  }, [apiBase, boxId])

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
        <span className={`box-badge ${lang}`}>{lang === 'ts' ? 'TypeScript' : 'Python'}</span>
        <span className="box-title">{title}</span>
        <span className="box-coords">
          {pos.x.toFixed(3)}, {pos.y.toFixed(3)}
        </span>
      </div>
      <div className="box-canvas" ref={canvasRef}>
        <div className="crosshair-h" />
        <div className="crosshair-v" />
        <div
          className="marker"
          style={{ left, top }}
          onMouseDown={onMouseDown}
        />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div className="layout">
      <header className="header">
        <div className="logo">
          Over<span>·</span>Engineering
        </div>
        <nav>
          <a href="#" className="active">App</a>
          <a href="#">About</a>
        </nav>
      </header>
      <main className="main">
        <PositionBox lang="ts" title="NestJS" boxId="ts" apiBase="http://localhost:3001" />
        <PositionBox lang="py" title="FastAPI" boxId="py" apiBase="http://localhost:8000" />
      </main>
    </div>
  )
}
