from fastapi import FastAPI

app = FastAPI(title="backend-py")


@app.get("/health")
async def health():
    return {"status": "ok"}
