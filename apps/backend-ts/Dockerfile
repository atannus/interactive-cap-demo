# Stage 1: install dependencies
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/backend-ts/package.json ./apps/backend-ts/
RUN pnpm install --frozen-lockfile --filter backend-ts...

# Stage 2: build
FROM deps AS builder
COPY apps/backend-ts/src ./apps/backend-ts/src
COPY apps/backend-ts/tsconfig*.json ./apps/backend-ts/
COPY apps/backend-ts/nest-cli.json ./apps/backend-ts/
RUN pnpm --filter backend-ts build

# Stage 3: produce self-contained prod node_modules
FROM deps AS deployer
RUN pnpm --filter backend-ts deploy --legacy /deploy

# Stage 4: runtime
FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=deployer /deploy/node_modules ./node_modules
COPY --from=builder /repo/apps/backend-ts/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main"]
