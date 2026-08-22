FROM node:22-alpine AS builder
# Corepack resolves pnpm from the root package.json "packageManager" field, so
# the version stays in one place instead of drifting against a hardcoded pin.
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/frontend/package.json ./apps/frontend/

RUN pnpm install --frozen-lockfile --filter frontend...

COPY apps/frontend ./apps/frontend/

RUN pnpm --filter frontend build

FROM nginx:alpine
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
