FROM python:3.13-slim
WORKDIR /app
RUN pip install uv
RUN uv pip install --system \
    "fastapi>=0.111.0" \
    "uvicorn[standard]>=0.30.0" \
    "asyncpg>=0.29.0" \
    "redis>=5.0.4" \
    "sqlalchemy[asyncio]>=2.0.30" \
    "pydantic-settings>=2.2.1"
COPY main.py .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
