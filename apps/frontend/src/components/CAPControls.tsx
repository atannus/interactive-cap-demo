import { usePartition } from '../context/PartitionContext'
import { RedisDot } from './RedisDot'

export function CAPControls() {
  const {
    capMode, partitionSource,
    healingHeuristic, autoPartitionMode,
    tsRedisConnected, pyRedisConnected,
    setHealingHeuristic, onPartitionModeChange,
    onTrigger, onHeal,
  } = usePartition()

  const partitioned = capMode !== 'normal'

  const healLabel =
    healingHeuristic === 'lww' ? 'last write wins' :
    healingHeuristic === 'ts-wins' ? 'NestJS wins' : 'FastAPI wins'

  return (
    <div className="cap-bar">
      <div className="cap-controls-row">
        <div className="mode-segment">
          <button
            className={`mode-pill${autoPartitionMode === 'AP' ? ' active' : ''}`}
            onClick={() => onPartitionModeChange('AP')}
            disabled={partitioned}
          >AP</button>
          <button
            className={`mode-pill${autoPartitionMode === 'CP' ? ' active' : ''}`}
            onClick={() => onPartitionModeChange('CP')}
            disabled={partitioned}
          >CP</button>
        </div>
        <span className="cap-label">on heal:</span>
        <div className="mode-segment">
          <button
            className={`mode-pill${healingHeuristic === 'lww' ? ' active' : ''}`}
            onClick={() => setHealingHeuristic('lww')}
          >LWW</button>
          <button
            className={`mode-pill${healingHeuristic === 'ts-wins' ? ' active' : ''}`}
            onClick={() => setHealingHeuristic('ts-wins')}
          >NestJS</button>
          <button
            className={`mode-pill${healingHeuristic === 'py-wins' ? ' active' : ''}`}
            onClick={() => setHealingHeuristic('py-wins')}
          >FastAPI</button>
        </div>
        <div className="cap-divider" />
        <button
          className={`cap-btn trigger-${autoPartitionMode.toLowerCase()}`}
          onClick={onTrigger}
          disabled={partitioned}
        >Simulate Partition</button>
        <button
          className="cap-btn heal"
          onClick={onHeal}
          disabled={!partitioned || partitionSource === 'auto'}
        >Heal Partition</button>
        {partitioned && (
          <span className={`partition-banner ${capMode.toLowerCase()}`}>
            {partitionSource === 'auto' ? 'DETECTED' : 'SIMULATED'} / {capMode}
          </span>
        )}
        <div className="cap-divider" />
        <span className="cap-label">NestJS</span><RedisDot connected={partitioned && partitionSource === 'manual' ? false : tsRedisConnected} />
        <span className="cap-label">FastAPI</span><RedisDot connected={partitioned && partitionSource === 'manual' ? false : pyRedisConnected} />
      </div>
      <p className="cap-desc">
        {partitioned
          ? capMode === 'AP'
            ? `Available: Replication suppressed, both backends accept writes and will diverge. When healed, ${healLabel}.`
            : `Consistent: Writes rejected on both backends, no divergence, no availability. When healed, ${healLabel}.`
          : autoPartitionMode === 'AP'
            ? `Available: Both backends stay available, markers will diverge. When healed, ${healLabel}.`
            : `Consistent: Writes rejected on both backends, no divergence, no availability. When healed, ${healLabel}.`}
      </p>
    </div>
  )
}
