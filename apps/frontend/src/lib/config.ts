const TS_BASE = import.meta.env.VITE_BACKEND_TS_URL ?? 'http://localhost:3001'
const PY_BASE = import.meta.env.VITE_BACKEND_PY_URL ?? 'http://localhost:8000'

export const TS_REST = TS_BASE
export const PY_REST = PY_BASE
export const TS_WS = TS_BASE.replace(/^http/, 'ws')
export const PY_WS = PY_BASE.replace(/^http/, 'ws')
