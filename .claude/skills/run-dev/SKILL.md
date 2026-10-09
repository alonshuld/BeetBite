---
name: run-dev
description: Start (or reuse) the BeetBite dev stack — Postgres in Docker, backend :3000 and frontend :5173 with hot reload — and confirm it is healthy. Use when asked to run, start, restart, or stop the app for development, to open it in a browser, or to check a change in the real app. Supports a throwaway demo-data DB via `demo`.
---

# Run BeetBite for development

Stack: Postgres (Docker, `:5432`) → NestJS backend (`:3000`, `api/v1`) → Vite frontend (`:5173`, proxies `/api`). Args: none = normal dev DB, `demo` = throwaway seeded DB on `:5433`, `stop` = shut everything down.

## 0. Shell setup (every Bash call)

Node and pnpm come from nvm and are **not** on the non-interactive PATH, and the backend reads `DATABASE_URL` / `JWT_SECRET` / `ADMIN_*` from the **root** `.env` (`apps/backend/.env` is effectively empty). Prefix commands with:

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh" >/dev/null; cd /home/alonsd/dev/BeetBite
```

and, for anything that starts the backend or runs Prisma, also `set -a; . ./.env; set +a`. Never print `.env` values — only check that keys exist (`grep -c '^JWT_SECRET=.' .env`). If `.env` is missing, stop and tell the user to `cp .env.example .env` and fill `JWT_SECRET` + `ADMIN_PASSWORD`; don't invent secrets for them.

## 1. Reuse before starting

```bash
curl -sf localhost:3000/api/v1/health && curl -sfo /dev/null localhost:5173 && echo UP
```

If both answer, the stack is already running (often in the user's own terminal) — **reuse it, don't start a second one**. Hot reload picks up code changes. Only restart if the user asks or the backend needs a fresh `db:sync` (schema/migration change).

If `:3000` is taken but `docker compose ps backend` shows the container running, that's the Docker backend: `docker compose stop backend` (both bind `:3000`).

## 2. Start

```bash
docker compose up db -d --wait
```

Then start the dev servers **in the background** (Bash `run_in_background: true`), logging to `dev.log` in your scratchpad directory (substitute its path for `<scratchpad>`):

```bash
set -a; . ./.env; set +a; pnpm dev > <scratchpad>/dev.log 2>&1
```

`pnpm dev` runs the backend's `db:sync` first (migrate deploy → prisma generate → drift check). For demo mode use `pnpm dev:demo` instead (recreates a tmpfs Postgres on `:5433`, migrates, seeds mock data — the real dev DB is untouched; showcase month is May 2026).

## 3. Wait for healthy

Use Monitor (or a bounded until-loop) rather than sleeping:

```bash
until curl -sf localhost:3000/api/v1/health >/dev/null && curl -sfo /dev/null localhost:5173; do sleep 2; done
```

Give it ~90 s (this box has ~3.8 GB RAM; Nest's first compile is slow). If it doesn't come up, read the tail of `dev.log`:

- `db:sync — the database does not match prisma/schema.prisma` → schema edited without a migration: `cd apps/backend && pnpm exec prisma migrate dev --name <change>` (ask before `migrate reset` — it wipes dev data).
- Missing Prisma fields / type errors → `cd apps/backend && pnpm exec prisma generate`.
- `EADDRINUSE` → something already holds the port; see step 1.
- `JWT_SECRET` / `ADMIN_PASSWORD` errors → root `.env` wasn't sourced or is incomplete.

## 4. Report

Tell the user: frontend http://localhost:5173, API http://localhost:3000/api/v1, log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env` (demo DB: same credentials, seeded from the same env). Mention where the log is and that the servers keep running in the background.

When driving the app in a browser: a backgrounded Chrome tab stalls React renders — check `document.hidden` before debugging a blank page.

## Stop

- Background `pnpm dev` you started: stop that task (TaskStop) — don't kill a dev server the user started themselves without asking.
- Demo DB: `pnpm dev:demo:down`.
- Dev Postgres: leave it running unless asked (`docker compose stop db`).

## Notes

- Don't run unit/e2e suites in parallel with each other on this machine; the running dev stack is fine alongside one suite.
- Demo data into the **normal** dev DB is destructive (`SEED_MOCK_DATA=true pnpm exec prisma db seed` in `apps/backend` wipes business tables) — ask first; prefer `demo` mode.
- After backend DTO changes, regenerate frontend API types: `pnpm --filter frontend codegen` (backend must be up).
