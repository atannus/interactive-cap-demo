# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Infrastructure

Start Postgres and Redis before running any service:
```bash
docker compose up -d
```
Credentials: user `app`, password `app`, database `app`, all on localhost defaults.

## Development

Run all three services together from the repo root:
```bash
pnpm dev
```

Or individually:
```bash
pnpm dev:frontend       # Vite dev server — http://localhost:5173
pnpm dev:backend-ts     # NestJS watch mode — http://localhost:3001
pnpm dev:backend-py     # FastAPI reload — http://localhost:8000
```

### NestJS (apps/backend-ts)
```bash
pnpm --filter backend-ts build       # compile
pnpm --filter backend-ts lint        # eslint --fix
pnpm --filter backend-ts test        # jest
pnpm --filter backend-ts test:e2e    # jest e2e
```

### FastAPI (apps/backend-py)
The Python service uses a local venv managed by `uv`. Always prefix Python/pip commands with `.venv/bin/`:
```bash
cd apps/backend-py
uv pip install <package>             # install a dependency
.venv/bin/python -c "import main"    # syntax-check main.py
```
No test runner is configured yet.

### Frontend (apps/frontend)
```bash
pnpm --filter frontend build   # tsc + vite build
pnpm --filter frontend lint    # eslint
```

## Architecture

This is a polyglot monorepo (pnpm workspaces) demonstrating real-time synchronization across two independent backends that share a PostgreSQL database and a Redis pub/sub channel.

```
Frontend (React/Vite :5173)
  ├── REST PATCH + WebSocket ──► NestJS (:3001)
  └── REST PATCH + WebSocket ──► FastAPI (:8000)
                                    │
                          PostgreSQL + Redis pub/sub
                          (both backends read/write)
```

**Shared state:** a single `positions` table row (`box_id = "ts"`). Either backend can upsert it. After a write, the writer publishes to the Redis channel `position:updated`. Each backend has a separate Redis subscriber that forwards incoming messages over WebSocket to all connected frontend clients.

**NestJS WS:** `PositionGateway` is a plain `@Injectable()` (not a `@WebSocketGateway`) that owns a `ws.Server({ noServer: true })`. `main.ts` wires it to the HTTP server's `upgrade` event at path `/ws`. This avoids the `WsAdapter` abstraction.

**FastAPI WS:** a background asyncio task subscribes to Redis and broadcasts to all connected WebSocket clients stored in a module-level `set`.

**Frontend:** a single `PositionBox` component is instantiated twice with different `restUrl`/`wsUrl` props. Position starts as `null` and is loaded via GET on mount. During drag, WS updates are suppressed via a `dragging` ref to avoid jitter from self-echo.

## Key files
- `apps/backend-ts/src/position/` — NestJS entity, service, controller, gateway, module
- `apps/backend-ts/src/app.module.ts` — TypeORM + ConfigModule setup
- `apps/backend-ts/src/redis.provider.ts` — shared ioredis client token `REDIS_CLIENT`
- `apps/backend-py/main.py` — entire FastAPI service (single file)
- `apps/frontend/src/App.tsx` — entire frontend (single file)
