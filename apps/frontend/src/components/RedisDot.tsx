export function RedisDot({ connected }: { connected: boolean | null }) {
  const cls = connected === null ? 'unknown' : connected ? 'connected' : 'disconnected'
  const title = connected === null ? 'Redis: unknown' : connected ? 'Redis: connected' : 'Redis: disconnected'
  return <span className={`redis-dot ${cls}`} title={title} />
}
