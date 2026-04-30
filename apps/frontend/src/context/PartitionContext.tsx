import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { BackendStatus, CapMode, HealingHeuristic, LocalState } from '../types'
import { TS_REST, PY_REST } from '../lib/config'
import { fmt } from '../lib/utils'
import { useEventLog } from './EventLogContext'

interface PartitionContextValue {
  capMode: CapMode
  partitionSource: 'manual' | 'auto'
  demoMode: boolean
  healingHeuristic: HealingHeuristic
  autoPartitionMode: 'AP' | 'CP'
  tsRedisConnected: boolean | null
  pyRedisConnected: boolean | null
  setHealingHeuristic: (h: HealingHeuristic) => void
  switchMode: () => void
  onTrigger: (mode: 'AP' | 'CP') => void
  onHeal: () => void
  onAutoPartitionModeChange: (mode: 'AP' | 'CP') => void
  onTsStatus: (status: BackendStatus) => void
  onPyStatus: (status: BackendStatus) => void
}

const PartitionContext = createContext<PartitionContextValue | null>(null)

export function PartitionProvider({ children }: { children: ReactNode }) {
  const { addEvent } = useEventLog()

  const [demoMode, setDemoMode] = useState(true)
  const [capMode, setCapMode] = useState<CapMode>('normal')
  const [partitionSource, setPartitionSource] = useState<'manual' | 'auto'>('manual')
  const [healingHeuristic, setHealingHeuristic] = useState<HealingHeuristic>('lww')
  const [autoPartitionMode, setAutoPartitionMode] = useState<'AP' | 'CP'>('AP')
  const [tsStatus, setTsStatus] = useState<BackendStatus | null>(null)
  const [pyStatus, setPyStatus] = useState<BackendStatus | null>(null)

  const heal = useCallback(async (heuristic: HealingHeuristic) => {
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
      if (heuristic === 'lww') {
        winner = tsT >= pyT ? tsRes : pyRes
        const winnerName = tsT >= pyT ? 'NestJS' : 'FastAPI'
        addEvent(
          `LWW: NestJS ts=${tsRes.updated_at.slice(11, 23)} vs FastAPI ts=${pyRes.updated_at.slice(11, 23)} — ${winnerName} wins`,
          'success',
        )
      } else if (heuristic === 'ts-wins') {
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
  }, [addEvent])

  const onHeal = useCallback(() => heal(healingHeuristic), [heal, healingHeuristic])

  // Mode switching is only allowed when no partition is active
  const switchMode = useCallback(() => {
    if (capMode !== 'normal') return
    setDemoMode(prev => !prev)
  }, [capMode])

  const onTrigger = useCallback(async (mode: 'AP' | 'CP') => {
    await Promise.all([
      fetch(`${TS_REST}/admin/partition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: true, mode }) }),
      fetch(`${PY_REST}/admin/partition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: true, mode }) }),
    ])
    setPartitionSource('manual')
    setCapMode(mode)
    addEvent(
      mode === 'AP'
        ? 'AP partition triggered — replication suppressed, both backends accept writes'
        : 'CP partition triggered — writes rejected on both backends',
      'warn',
    )
  }, [addEvent])

  const onAutoPartitionModeChange = useCallback(async (mode: 'AP' | 'CP') => {
    setAutoPartitionMode(mode)
    await Promise.all([
      fetch(`${TS_REST}/admin/partition-config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ autoMode: mode }) }),
      fetch(`${PY_REST}/admin/partition-config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ autoMode: mode }) }),
    ])
  }, [])

  const onTsStatus = useCallback((status: BackendStatus) => setTsStatus(status), [])
  const onPyStatus = useCallback((status: BackendStatus) => setPyStatus(status), [])

  // Infra-detection: only active in Infrastructure mode
  useEffect(() => {
    if (demoMode) return
    if (!tsStatus || !pyStatus) return
    if (capMode !== 'normal') return
    const tsAuto = tsStatus.partition.active && tsStatus.partition.source === 'auto'
    const pyAuto = pyStatus.partition.active && pyStatus.partition.source === 'auto'
    if (tsAuto || pyAuto) {
      const mode = (tsAuto ? tsStatus : pyStatus).partition.mode
      setCapMode(mode)
      setPartitionSource('auto')
      addEvent(`Infrastructure partition detected — Redis down, ${mode} mode active`, 'warn')
    }
  }, [tsStatus, pyStatus, capMode, demoMode, addEvent])

  // Auto-heal when Redis reconnects: only active in Infrastructure mode
  useEffect(() => {
    if (demoMode) return
    if (partitionSource !== 'auto') return
    if (capMode === 'normal') return
    if (!tsStatus || !pyStatus) return
    if (tsStatus.partition.active || pyStatus.partition.active) return
    if (!tsStatus.redis.connected || !pyStatus.redis.connected) return
    addEvent('Redis reconnected — auto-healing with last-write-wins', 'info')
    setPartitionSource('manual')
    heal('lww')
  }, [tsStatus, pyStatus, partitionSource, capMode, demoMode, addEvent, heal])

  return (
    <PartitionContext.Provider value={{
      capMode,
      partitionSource,
      demoMode,
      healingHeuristic,
      autoPartitionMode,
      tsRedisConnected: tsStatus?.redis.connected ?? null,
      pyRedisConnected: pyStatus?.redis.connected ?? null,
      setHealingHeuristic,
      switchMode,
      onTrigger,
      onHeal,
      onAutoPartitionModeChange,
      onTsStatus,
      onPyStatus,
    }}>
      {children}
    </PartitionContext.Provider>
  )
}

export function usePartition(): PartitionContextValue {
  const ctx = useContext(PartitionContext)
  if (!ctx) throw new Error('usePartition must be used within PartitionProvider')
  return ctx
}
