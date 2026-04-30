import { usePartition } from '../context/PartitionContext'
import { RedisDot } from './RedisDot'

export function CAPControls() {
  const {
    capMode, partitionSource, healingHeuristic, partitionDuration,
    autoPartitionMode, tsRedisConnected, pyRedisConnected,
    setHealingHeuristic, setPartitionDuration, onAutoPartitionModeChange,
    onTrigger, onHeal,
  } = usePartition()

  if (capMode !== 'normal') {
    const isInfra = partitionSource === 'auto'
    const bannerLabel = isInfra
      ? `INFRA PARTITION / ${capMode}`
      : `PARTITION ACTIVE / ${capMode}`

    return (
      <div className="cap-bar">
        <div className="cap-controls-row">
          <span className={`partition-banner ${capMode.toLowerCase()}`}>{bannerLabel}</span>
          {isInfra ? (
            <span className="cap-label">Auto-healing when Redis reconnects</span>
          ) : (
            <>
              <button className="cap-btn heal" onClick={onHeal}>Heal Partition</button>
              <span className="cap-heuristic-label">
                on heal: {healingHeuristic === 'lww' ? 'last-write-wins' : healingHeuristic === 'ts-wins' ? 'NestJS wins' : 'FastAPI wins'}
              </span>
            </>
          )}
          <div className="cap-divider" />
          <span className="cap-label">NestJS</span><RedisDot connected={tsRedisConnected} />
          <span className="cap-label">FastAPI</span><RedisDot connected={pyRedisConnected} />
        </div>
        <p className="cap-desc">
          {capMode === 'AP'
            ? isInfra
              ? 'Redis is down — replication severed. Both backends accept writes and will diverge.'
              : 'Replication suppressed — both backends accept writes and will diverge.'
            : isInfra
              ? 'Redis is down — writes rejected on both backends. No divergence.'
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
          onChange={e => setHealingHeuristic(e.target.value as typeof healingHeuristic)}
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
          onChange={e => setPartitionDuration(e.target.value)}
        />
        <span className="cap-label">s</span>
        <button className="cap-btn trigger-ap" onClick={() => onTrigger('AP')}>Trigger AP Partition</button>
        <button className="cap-btn trigger-cp" onClick={() => onTrigger('CP')}>Trigger CP Partition</button>
        <div className="cap-divider" />
        <label className="cap-label">Redis-down mode</label>
        <select
          className="cap-select"
          value={autoPartitionMode}
          onChange={e => onAutoPartitionModeChange(e.target.value as 'AP' | 'CP')}
        >
          <option value="AP">AP (diverge)</option>
          <option value="CP">CP (freeze)</option>
        </select>
        <div className="cap-divider" />
        <span className="cap-label">NestJS</span><RedisDot connected={tsRedisConnected} />
        <span className="cap-label">FastAPI</span><RedisDot connected={pyRedisConnected} />
      </div>
      <p className="cap-desc">
        AP: both backends stay available, markers will diverge. CP: writes rejected, markers frozen.
        Redis-down mode configures behavior when the Redis service fails.
      </p>
    </div>
  )
}
