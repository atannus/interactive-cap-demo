# edu.over-engineering

A polyglot monorepo demonstrating real-time position synchronisation across two independent backends sharing a PostgreSQL database and Redis pub/sub channel. Built as a platform for CAP theorem experiments.

```
Frontend (React/Vite :5173)
  ├── REST PATCH + WebSocket ──► NestJS (:3001)
  └── REST PATCH + WebSocket ──► FastAPI (:8000)
                                    │
                          PostgreSQL + Redis pub/sub
                          (both backends read/write)
```

## Prerequisites

- Node.js + pnpm
- Python 3.11+ + uv
- Docker + Docker Compose
- minikube + kubectl + helm (for Kubernetes)

## Local development

Start Postgres and Redis, then all three services:

```bash
docker compose up -d
pnpm dev
```

| Service         | URL                   |
|-----------------|-----------------------|
| Frontend        | http://localhost:5173 |
| NestJS backend  | http://localhost:3001 |
| FastAPI backend | http://localhost:8000 |

## Kubernetes (minikube)

### First-time setup

```bash
minikube start
make build    # builds all three images into minikube's docker daemon
make deploy   # applies all k8s manifests
minikube tunnel  # separate terminal — maps LoadBalancer IPs to localhost
```

| Service         | URL                   |
|-----------------|-----------------------|
| Frontend        | http://localhost      |
| NestJS backend  | http://localhost:3001 |
| FastAPI backend | http://localhost:8000 |

### After making code changes

Because images are tagged `:latest` and `imagePullPolicy: Never`, Kubernetes won't detect that new code is available — you need to rebuild the image and explicitly restart the affected deployment(s).

**One service changed** (e.g. only frontend):
```bash
eval $(minikube docker-env)
docker build -t edu-oe/frontend:latest -f apps/frontend/Dockerfile .
kubectl rollout restart deployment/frontend -n edu-oe
```

**Multiple or all services changed:**
```bash
make build
kubectl rollout restart deployment/backend-ts deployment/backend-py deployment/frontend -n edu-oe
```

Wait for the rollout:
```bash
kubectl rollout status deployment/backend-ts deployment/backend-py deployment/frontend -n edu-oe
```

### Teardown

```bash
make teardown
```

## Observability (Prometheus + Grafana + Loki)

Requires minikube to be running with the app already deployed.

### Setup

```bash
make observe
```

This installs `kube-prometheus-stack`, `loki`, and `alloy` via Helm into the `monitoring` namespace, then applies the ServiceMonitors, Grafana dashboard ConfigMap, and Loki datasource ConfigMap.

### Accessing Grafana

With `minikube tunnel` running, Grafana is at **http://localhost:3000** — login `admin` / `admin`.

The **edu-oe App Metrics** dashboard is auto-imported and shows:
- HTTP request rate and p95 latency per backend
- Active WebSocket connections
- Redis pub/sub message rates
- Live logs from the `edu-oe` namespace

The Loki datasource is provisioned automatically — no manual setup needed.

### Teardown

```bash
make observe-teardown
```
