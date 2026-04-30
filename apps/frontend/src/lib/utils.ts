import type { Position } from '../types'

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export function fmt(p: Position) {
  return `(${p.x.toFixed(3)}, ${p.y.toFixed(3)})`
}
