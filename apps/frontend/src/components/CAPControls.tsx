import { usePartition } from '../context/PartitionContext'
import { RedisDot } from './RedisDot'

export function CAPControls() {
  const {
    capMode, demoMode, switchMode,
    healingHeuristic, partitionDuration, autoPartitionMode,
    tsRedisConnected, pyRedisConnected,
    setHealingHeuristic, setPartitionDuration, onAutoPartitionModeChange,
    onTrigger, onHeal,
  } = usePartition()

  const partitioned = capMode !== 'normal'

  const modeSegment = (
    <div className="mode-segment">
      <button
        className={`mode-pill${demoMode ? ' active' : ''}`}
        onClick={switchMode}
        disabled={partitioned}
        title={partitioned ? 'Resolve the active partition before switching modes' : undefined}
      >Demo</button>
      <button
        className={`mode-pill${!demoMode ? ' active' : ''}`}
        onClick={switchMode}
        disabled={partitioned}
        title={partitioned ? 'Resolve the active partition before switching modes' : undefined}
      >Infrastructure</button>
    </div>
  )

  const redisDots = (
    <>
      <div className="cap-divider" />
      <span className="cap-label">NestJS</span><RedisDot connected={tsRedisConnected} />
      <span className="cap-label">FastAPI</span><RedisDot connected={pyRedisConnected} />
    </>
  )

  if (partitioned) {
    const bannerLabel = demoMode
      ? `PARTITION ACTIVE / ${capMode}`
      : `INFRA PARTITION / ${capMode}`

    return (
      <div className="cap-bar">
        <div className="cap-controls-row">
          {modeSegment}
          <div className="cap-divider" />
          <span className={`partition-banner ${capMode.toLowerCase()}`}>{bannerLabel}</span>
          {demoMode ? (
            <>
              <button className="cap-btn heal" onClick={onHeal}>Heal Partition</button>
              <span className="cap-heuristic-label">
                on heal: {healingHeuristic === 'lww' ? 'last-write-wins' : healingHeuristic === 'ts-wins' ? 'NestJS wins' : 'FastAPI wins'}
              </span>
            </>
          ) : (
            <span className="cap-label">Auto-healing when Redis reconnects</span>
          )}
          {redisDots}
        </div>
        <p className="cap-desc">
          {capMode === 'AP'
            ? demoMode
              ? 'Replication suppressed — both backends accept writes and will diverge.'
              : 'Redis is down — replication severed. Both backends accept writes and will diverge.'
            : demoMode
              ? 'Writes rejected on both backends — no divergence, no availability.'
              : 'Redis is down — writes rejected on both backends. No divergence.'}
        </p>
      </div>
    )
  }

  return (
    <div className="cap-bar">
      <div className="cap-controls-row">
        {modeSegment}
        <div className="cap-divider" />
        {demoMode ? (
          <>
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
          </>
        ) : (
          <>
            <label className="cap-label">Redis-down mode</label>
            <select
              className="cap-select"
              value={autoPartitionMode}
              onChange={e => onAutoPartitionModeChange(e.target.value as 'AP' | 'CP')}
            >
              <option value="AP">AP (diverge)</option>
              <option value="CP">CP (freeze)</option>
            </select>
          </>
        )}
        {redisDots}
      </div>
      <p className="cap-desc">
        {demoMode
          ? 'AP: both backends stay available, markers will diverge. CP: writes rejected, markers frozen.'
          : 'Configures behavior when the Redis service fails. Partition activates automatically on Redis loss.'}
      </p>
    </div>
  )
}
