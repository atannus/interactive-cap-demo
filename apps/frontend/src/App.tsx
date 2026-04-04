import { useCallback, useRef, useState } from 'react'
import './App.css'

interface Position {
  x: number
  y: number
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function PositionBox({ lang, title }: { lang: 'ts' | 'py'; title: string }) {
  const [pos, setPos] = useState<Position>({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

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
      setPos(toNormalized(e.clientX, e.clientY))
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [toNormalized])

  // Map -1..1 to CSS percentage (0%..100%)
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
        <PositionBox lang="ts" title="NestJS" />
        <PositionBox lang="py" title="FastAPI" />
      </main>
    </div>
  )
}
