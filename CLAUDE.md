# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Business domain

BeetBite is a back-office tool for a single contractor company that manages construction projects on behalf of clients. Each deployment of the application represents one such contractor.

**Clients** are people or companies that commission construction work. They agree on an estimated total cost for each **project** upfront (stored as `estimatedAmount`), then pay the contractor a monthly **income** as the work progresses. The income for a given month is recorded in a **ProjectReport**; the exact date the client wires the money is `incomeDate` (null until payment arrives).

The contractor does not do the physical work itself. Instead it hires:

- **Subcontractors** — individual workers assigned to a project for a given month. Each project report has exactly one subcontractor.
- **Suppliers** — specialist firms (flooring, plumbing, etc.) paid fixed amounts per month per project, stored as **SupplierPayments** attached to the report.

Each month, the contractor keeps a **profit margin** percentage of the income, then pays the suppliers their agreed amounts, and the subcontractor receives whatever is left. These values are derived at read time, not stored (see backend CLAUDE.md → *Financial calculations*).

**SubcontractorPayments** track partial payments made to a subcontractor for a given service month. Multiple partial payments per month are allowed. The amount owed is computed from project reports at read time; the service rejects any payment that would cause the total paid to exceed that amount.

**Company Settings** is a singleton record holding the contractor's own profile — name, description, company registration number, phone, email, address (street + city), logo, and signature (images stored as base64 data URLs, no file upload infra). On first login, if it doesn't exist yet, the user is nudged to an onboarding screen to fill it in; this is a soft, skippable nudge (not a blocking gate) and the data is editable anytime after from a Settings page. None of these fields are required to use the app — a future PDF-export feature will require name + company number before exporting, but that's enforced by export, not here.

Users manually enter clients, projects, suppliers, and subcontractors once, then create a project report each month per project. The system derives all financial insights (profits, payments, income totals, project payment progress) from these reports.

## Monorepo structure

pnpm workspace. Three apps under `apps/`:

| App | Path | Description |
| --- | --- | --- |
| `backend` | `apps/backend/` | NestJS REST API + PostgreSQL (Prisma) |
| `frontend` | `apps/frontend/` | Vite + React 18 + RTK Query SPA |
| `e2e` | `apps/e2e/` | Playwright end-to-end tests |

Each app has its own `CLAUDE.md` with stack details, commands, and architecture. Read those for app-specific work.

## Root commands

Run from the repo root — these delegate to each app via `pnpm -r`:

```bash
pnpm dev            # Start backend + frontend dev servers (parallel)
pnpm build          # Build all apps
pnpm test           # Run all unit tests (backend Jest + frontend Vitest)
pnpm lint           # ESLint + tsc across all apps (auto-fix)
pnpm lint:check     # ESLint + tsc (no fix, used by pre-commit hook)
pnpm format         # Prettier across all apps
pnpm format:check   # Prettier check (no write)

# E2E tests (requires Docker)
pnpm test:e2e       # Run Playwright suite via apps/e2e

# Docker — spin up DB + backend only (leave frontend to pnpm dev)
pnpm infra:up       # docker compose up db backend -d
pnpm infra:down     # docker compose stop db backend
```

## How the apps connect

```
Browser → frontend (Vite :5173)
              ↓ /api/* proxy
         backend (NestJS :3000)
              ↓ Prisma
         PostgreSQL (:5432)
```

- Frontend's Vite dev server proxies `/api` → `http://localhost:3000` (`vite.config.ts`).
- All backend routes are prefixed `api/v1`.
- Auth: frontend stores JWT in `localStorage` (`beetbite.token`); every request sends `Authorization: Bearer <token>`; backend validates via global `JwtAuthGuard`. See `apps/backend/CLAUDE.md` → Authentication.
- API types: frontend generates TypeScript types from backend's OpenAPI spec (`pnpm --filter frontend codegen`). Re-run whenever backend DTOs change.

## E2E tests

Playwright suite in `apps/e2e/tests/`. Covers all nine domain areas (auth, clients, projects, project reports, suppliers, supplier payments, subcontractors, subcontractor payments, income).

`global-setup.ts` bootstraps the full stack automatically:
1. Starts a PostgreSQL testcontainer
2. Runs `prisma migrate deploy`
3. Seeds an admin user (`e2e-admin` / `E2eTest1234!`)
4. Builds and starts the backend on `:3001`
5. Starts the frontend on `:5174` using `vite.config.e2e.ts` (proxies `/api` → `:3001`)
6. Logs in and saves browser auth state to `playwright/.auth/user.json`

Each test file imports from `fixtures/db.fixture.ts`, which provides a Prisma client connected to the test DB and truncates all tables in FK-safe order after every test.

Run with:
```bash
pnpm test:e2e                                  # headless
pnpm --filter e2e exec playwright test --ui    # interactive UI
E2E_VERBOSE=1 pnpm test:e2e                    # verbose backend/frontend output
```

## Docker Compose

`docker-compose.yml` defines three services: `db` (Postgres 17), `backend`, `frontend`.

Copy `.env.example` to `.env` and fill it in first — `JWT_SECRET` and `ADMIN_PASSWORD` are required and compose aborts if either is missing. They are deliberately not defaulted: a default in the repo is a signing key and an admin login that every reader of the repo already knows.

```bash
cp .env.example .env
# edit .env — JWT_SECRET (openssl rand -base64 48) and ADMIN_PASSWORD
docker compose up
```

`ADMIN_PASSWORD` bootstraps the admin account on first start only; the seed never overwrites an existing password, so restarts cannot reset a rotated credential. Demo data is opt-in via `SEED_MOCK_DATA=true` and is destructive — it truncates every business table before inserting fixtures.

Backend and frontend each have a `Dockerfile` in their app directory.

## Pre-commit hook

Husky runs `pnpm format:check` then `pnpm lint:check` on every commit. Fix with `pnpm format && pnpm lint` before committing.
