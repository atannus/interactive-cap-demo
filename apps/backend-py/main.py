import asyncio
import json
import os
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
POSITION_CHANNEL = "position:updated"

# Connected WebSocket clients
clients: set[WebSocket] = set()


async def redis_subscriber():
    r = aioredis.Redis(host=REDIS_HOST, port=REDIS_PORT)
    pubsub = r.pubsub()
    await pubsub.subscribe(POSITION_CHANNEL)
    async for message in pubsub.listen():
        if message["type"] != "message":
            continue
        data = message["data"]
        if isinstance(data, bytes):
            data = data.decode()
        dead = set()
        for ws in clients:
            try:
                await ws.send_text(data)
            except Exception:
                dead.add(ws)
        clients.difference_update(dead)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(redis_subscriber())
    yield
    task.cancel()


app = FastAPI(title="backend-py", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    clients.add(ws)
    try:
        while True:
            await ws.receive_text()  # keep connection alive
    except WebSocketDisconnect:
        clients.discard(ws)
