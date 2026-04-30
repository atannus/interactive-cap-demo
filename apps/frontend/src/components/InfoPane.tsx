import { usePartition } from '../context/PartitionContext'

type PaneKey = 'demo-normal' | 'demo-ap' | 'demo-cp' | 'infra-normal' | 'infra-ap' | 'infra-cp'

interface PaneContent {
  badge: string
  badgeClass: string
  description: string
  steps: React.ReactNode[]
}

const CONTENT: Record<PaneKey, PaneContent> = {
  'demo-normal': {
    badge: 'Normal',
    badgeClass: 'normal',
    description:
      'Both backends are connected through Redis. Every write is applied locally, broadcast over WebSocket instantly, then published to Redis for replication. The other backend picks it up and mirrors the state.',
    steps: [
      'Drag either marker anywhere on its canvas.',
      'Watch the other marker mirror it in real time — that is Redis pub/sub replication.',
      'Both markers in sync means the system is healthy and consistent.',
    ],
  },
  'demo-ap': {
    badge: 'AP Partition',
    badgeClass: 'ap',
    description:
      'Replication is severed. Both backends continue accepting writes but no longer exchange state. You chose Availability over Consistency — writes succeed, but the two markers will diverge.',
    steps: [
      'Drag the NestJS marker to one corner of its canvas.',
      'Drag the FastAPI marker to a different position — they no longer mirror each other.',
      <>Click <strong>Heal Partition</strong> to reconcile. The chosen heuristic (LWW, NestJS-wins, or FastAPI-wins) picks the winner.</>,
    ],
  },
  'demo-cp': {
    badge: 'CP Partition',
    badgeClass: 'cp',
    description:
      'Replication is severed and writes are rejected. Both backends are frozen at their last known state. You chose Consistency over Availability — no divergence is possible, but the system is not writable.',
    steps: [
      'Try dragging either marker — the backend will reject the write with HTTP 503.',
      'The marker snaps back and the canvas flashes red.',
      <>Click <strong>Heal Partition</strong> to restore write availability and re-sync both markers.</>,
    ],
  },
  'infra-normal': {
    badge: 'Monitoring',
    badgeClass: 'monitoring',
    description:
      'Watching Redis health on both backends. If Redis becomes unreachable, the partition detector fires automatically and the configured mode (AP or CP) activates without any manual step.',
    steps: [
      <>Set <strong>Redis-down mode</strong> (AP or CP) in the controls above.</>,
      <>Stop the Redis container: <code>docker stop redis</code></>,
      'Watch the partition banner appear and the system react automatically.',
      <>Restart Redis to trigger auto-heal: <code>docker start redis</code></>,
    ],
  },
  'infra-ap': {
    badge: 'Infrastructure / AP',
    badgeClass: 'ap',
    description:
      'Redis is unreachable. Both backends detected the outage and entered AP mode. Replication is severed, but both services remain writable. The two backends are diverging.',
    steps: [
      'Drag either marker — writes still succeed on each backend independently.',
      'Notice the markers no longer mirror each other.',
      <>Restart Redis (<code>docker start redis</code>) to trigger automatic last-write-wins reconciliation.</>,
    ],
  },
  'infra-cp': {
    badge: 'Infrastructure / CP',
    badgeClass: 'cp',
    description:
      'Redis is unreachable. Both backends detected the outage and entered CP mode. Writes are being rejected to prevent divergence. The system is safe but unavailable for writes.',
    steps: [
      'Try dragging either marker — writes are rejected (HTTP 503), canvas flashes red.',
      <>Restart Redis (<code>docker start redis</code>) to restore write availability automatically.</>,
      'No reconciliation is needed — state was never written during the partition.',
    ],
  },
}

export function InfoPane() {
  const { demoMode, capMode } = usePartition()

  const key: PaneKey = demoMode
    ? capMode === 'AP' ? 'demo-ap' : capMode === 'CP' ? 'demo-cp' : 'demo-normal'
    : capMode === 'AP' ? 'infra-ap' : capMode === 'CP' ? 'infra-cp' : 'infra-normal'

  const { badge, badgeClass, description, steps } = CONTENT[key]

  return (
    <aside className="info-pane">
      <span className={`info-pane-badge ${badgeClass}`}>{badge}</span>
      <p className="info-pane-desc">{description}</p>
      <ol className="info-pane-steps">
        {steps.map((step, i) => <li key={i}>{step}</li>)}
      </ol>
    </aside>
  )
}
