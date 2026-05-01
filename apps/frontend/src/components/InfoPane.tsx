import { usePartition } from '../context/PartitionContext'

type PaneKey = 'normal' | 'simulated-ap' | 'simulated-cp' | 'detected-ap' | 'detected-cp'

interface PaneContent {
  badge: string
  badgeClass: string
  description: string
  steps: React.ReactNode[]
}

const CONTENT: Record<PaneKey, PaneContent> = {
  'normal': {
    badge: 'Healthy',
    badgeClass: 'normal',
    description:
      'Both backends are connected through Redis. Every write is applied locally, broadcast over WebSocket instantly, then published to Redis for replication. The other backend picks it up and mirrors the state.',
    steps: [
      'Drag either marker anywhere on its canvas.',
      'Watch the other marker mirror it in real time. That is Redis pub/sub replication.',
      <>Pick a partition type and heal heuristic, then click <strong>Simulate Partition</strong>, or take Redis down to trigger one for real.</>,
    ],
  },
  'simulated-ap': {
    badge: 'Simulated / AP',
    badgeClass: 'ap',
    description:
      'Replication is severed. Both backends continue accepting writes but no longer exchange state. You chose Availability over Consistency: writes succeed, but the two markers will diverge.',
    steps: [
      'Drag the NestJS marker to one corner of its canvas.',
      'Drag the FastAPI marker to a different position. They no longer mirror each other.',
      <>Click <strong>Heal Partition</strong> to reconcile. The chosen heuristic picks the winner.</>,
    ],
  },
  'simulated-cp': {
    badge: 'Simulated / CP',
    badgeClass: 'cp',
    description:
      'Replication is severed and writes are rejected. Both backends are frozen at their last known state. You chose Consistency over Availability: no divergence is possible, but the system is not writable.',
    steps: [
      'Try dragging either marker. The backend will reject the write with HTTP 503.',
      'The marker snaps back and the canvas flashes red.',
      <>Click <strong>Heal Partition</strong> to restore write availability and re-sync both markers.</>,
    ],
  },
  'detected-ap': {
    badge: 'Detected / AP',
    badgeClass: 'ap',
    description:
      'Redis is unreachable. Both backends detected the outage and entered AP mode automatically. Replication is severed, but both services remain writable. The two backends are diverging.',
    steps: [
      'Drag either marker. Writes still succeed on each backend independently.',
      'Notice the markers no longer mirror each other.',
      <>Restart Redis (<code>docker start redis</code>) to trigger automatic reconciliation using the configured heuristic.</>,
    ],
  },
  'detected-cp': {
    badge: 'Detected / CP',
    badgeClass: 'cp',
    description:
      'Redis is unreachable. Both backends detected the outage and entered CP mode automatically. Writes are being rejected to prevent divergence. The system is safe but unavailable for writes.',
    steps: [
      'Try dragging either marker. Writes are rejected (HTTP 503) and the canvas flashes red.',
      <>Restart Redis (<code>docker start redis</code>) to restore write availability automatically.</>,
      'No reconciliation needed. State was never written during the partition.',
    ],
  },
}

export function InfoPane() {
  const { capMode, partitionSource } = usePartition()

  let key: PaneKey = 'normal'
  if (capMode === 'AP') key = partitionSource === 'auto' ? 'detected-ap' : 'simulated-ap'
  else if (capMode === 'CP') key = partitionSource === 'auto' ? 'detected-cp' : 'simulated-cp'

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
