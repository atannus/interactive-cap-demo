# Stage 1: build
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
RUN pnpm install --frozen-lockfile --filter frontend...
COPY docs/diagrams ./docs/diagrams
COPY apps/frontend ./apps/frontend
ARG VITE_BACKEND_TS_URL
ARG VITE_BACKEND_PY_URL
RUN pnpm --filter frontend build

# Stage 2: runtime
FROM nginx:alpine AS runtime
COPY --from=builder /repo/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
