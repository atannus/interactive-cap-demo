export interface Position {
  x: number
  y: number
}

export interface LocalState {
  x: number
  y: number
  updated_at: string
  source: 'ts' | 'py'
}

export interface BackendStatus {
  partition: { active: boolean; mode: 'AP' | 'CP'; source: 'manual' | 'auto' }
  redis: { connected: boolean }
}

export type HealingHeuristic = 'lww' | 'ts-wins' | 'py-wins'
export type CapMode = 'normal' | 'AP' | 'CP'
export type LogLevel = 'info' | 'warn' | 'error' | 'success'

export interface LogEntry {
  id: number
  ts: number
  message: string
  level: LogLevel
}
