import asyncio
import json
import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, Gauge
from prometheus_fastapi_instrumentator import Instrumentator
from pydantic import BaseModel
from sqlalchemy import Column, Float, String, DateTime, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logging.getLogger("uvicorn.access").disabled = True

_http_logger = logging.getLogger("http")
_http_logger.setLevel(logging.INFO)
_http_handler = logging.StreamHandler()
_http_handler.setFormatter(logging.Formatter("%(levelname)s %(message)s"))
_http_logger.addHandler(_http_handler)
_http_logger.propagate = False

DATA_ID = "1"

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "app")
DB_PASSWORD = os.getenv("DB_PASSWORD", "app")
DB_NAME = os.getenv("DB_NAME", "app")
REPLICATION_CHANNEL = "position:replicated"

DATABASE_URL = (
    f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


class PositionRow(Base):
    __tablename__ = "positions_py"
    data_id = Column(String, primary_key=True)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)


# Connected WebSocket clients
clients: set[WebSocket] = set()

partition_active: bool = False
partition_mode: str = "AP"  # "AP" | "CP"

ws_connections_active = Gauge("ws_connections_active", "Active WebSocket connections")
redis_messages_published_total = Counter("redis_messages_published_total", "Redis messages published")
redis_messages_received_total = Counter("redis_messages_received_total", "Redis messages received")


async def broadcast(payload: dict) -> None:
    """Send a position update to all connected WebSocket clients."""
    text_data = json.dumps(payload)
    dead = set()
    for ws in clients:
        try:
            await ws.send_text(text_data)
        except Exception:
            dead.add(ws)
    clients.difference_update(dead)


async def apply_replication(x: float, y: float, updated_at_str: str) -> None:
    """Apply an incoming replication event from NestJS to positions_py and broadcast."""
    ts = datetime.fromisoformat(updated_at_str)
    async with AsyncSessionLocal() as session:
        await session.execute(
            text(
                """
                INSERT INTO positions_py (data_id, x, y, updated_at)
                VALUES (:data_id, :x, :y, :updated_at)
                ON CONFLICT (data_id) DO UPDATE
                SET x = EXCLUDED.x, y = EXCLUDED.y, updated_at = EXCLUDED.updated_at
                """
            ),
            {"data_id": DATA_ID, "x": x, "y": y, "updated_at": ts},
        )
        await session.commit()
    await broadcast({"x": x, "y": y, "updated_at": updated_at_str})


async def redis_subscriber():
    r = aioredis.Redis(host=REDIS_HOST, port=REDIS_PORT)
    pubsub = r.pubsub()
    await pubsub.subscribe(REPLICATION_CHANNEL)
    async for message in pubsub.listen():
        if message["type"] != "message":
            continue
        if partition_active:
            continue
        data = message["data"]
        if isinstance(data, bytes):
            data = data.decode()
        event = json.loads(data)
        if event.get("source") == "py":
            continue  # discard own replication events to avoid loops
        redis_messages_received_total.inc()
        await apply_replication(event["x"], event["y"], event["updated_at"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    task = asyncio.create_task(redis_subscriber())
    yield
    task.cancel()


app = FastAPI(title="backend-py", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://localhost(:\d+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
)
Instrumentator().instrument(app).expose(app)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    t0 = time.monotonic()
    response = await call_next(request)
    if request.url.path != "/metrics":
        ms = round((time.monotonic() - t0) * 1000)
        _http_logger.info(
            "%s %s %d %dms", request.method, request.url.path, response.status_code, ms
        )
    return response


class PositionBody(BaseModel):
    x: float
    y: float


class PartitionBody(BaseModel):
    active: bool
    mode: str


@app.post("/admin/partition")
async def set_partition(body: PartitionBody):
    global partition_active, partition_mode
    partition_active = body.active
    partition_mode = body.mode
    return {"active": partition_active, "mode": partition_mode}


@app.get("/admin/local-state")
async def get_local_state():
    async with AsyncSessionLocal() as session:
        row = await session.get(PositionRow, DATA_ID)
        if row is None:
            return None
        return {"x": row.x, "y": row.y, "updated_at": row.updated_at.isoformat(), "source": "py"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/position")
async def get_position():
    async with AsyncSessionLocal() as session:
        row = await session.get(PositionRow, DATA_ID)
        if row is None:
            return None
        return {"x": row.x, "y": row.y, "updated_at": row.updated_at.isoformat()}


@app.patch("/position")
async def update_position(body: PositionBody):
    if partition_active and partition_mode == "CP":
        raise HTTPException(status_code=503, detail="Partition active: CP mode rejects writes")
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as session:
        await session.execute(
            text(
                """
                INSERT INTO positions_py (data_id, x, y, updated_at)
                VALUES (:data_id, :x, :y, :updated_at)
                ON CONFLICT (data_id) DO UPDATE
                SET x = EXCLUDED.x, y = EXCLUDED.y, updated_at = EXCLUDED.updated_at
                """
            ),
            {"data_id": DATA_ID, "x": body.x, "y": body.y, "updated_at": now},
        )
        await session.commit()

    payload = {"x": body.x, "y": body.y, "updated_at": now.isoformat()}
    await broadcast(payload)
    if not partition_active:
        r = aioredis.Redis(host=REDIS_HOST, port=REDIS_PORT)
        await r.publish(REPLICATION_CHANNEL, json.dumps({"source": "py", **payload}))
        redis_messages_published_total.inc()
        await r.aclose()
    return payload


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    clients.add(ws)
    ws_connections_active.inc()
    try:
        while True:
            await ws.receive_text()  # keep connection alive
    except WebSocketDisconnect:
        pass
    finally:
        clients.discard(ws)
        ws_connections_active.dec()
