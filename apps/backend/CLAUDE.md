# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Business domain

BeetBite is a back-office tool for a single contractor company that manages construction projects on behalf of clients. Each deployment of the application represents one such contractor.

**Clients** are people or companies that commission construction work. They agree on an estimated total cost for each **project** upfront (stored as `estimatedAmount`), then pay the contractor a monthly **income** as the work progresses. The income for a given month is recorded in a **ProjectReport**; the exact date the client wires the money is `incomeDate` (null until payment arrives).

The contractor does not do the physical work itself. Instead it hires:
- **Subcontractors** — individual workers assigned to a project for a given month. Each project report has exactly one subcontractor.
- **Corporations** — specialist firms (flooring, plumbing, etc.) paid fixed amounts per month per project, stored as **CorporationPayments** attached to the report.

Each month, the contractor keeps a **profit margin** percentage of the income, then pays the corporations their agreed amounts, and the subcontractor receives whatever is left. These values are derived at read time, not stored (see *Financial calculations* below).

**SubcontractorPayments** track whether a subcontractor has actually been paid for a given service month across all their projects. The payment amount is aggregated at read time from that subcontractor's project reports for the month.

Users manually enter clients, projects, corporations, and subcontractors once, then create a project report each month per project. The system derives all financial insights (profits, payments, income totals, project payment progress) from these reports.

## Commands

```bash
# Development
pnpm start:dev          # Start with hot reload
pnpm build              # Compile TypeScript via NestJS CLI
pnpm start:prod         # Run compiled output

# Code quality
pnpm lint               # ESLint with auto-fix
pnpm format             # Prettier

# Testing
pnpm test               # Run all unit tests (jest, rootDir: src)
pnpm test:watch         # Watch mode
pnpm test:cov           # Coverage report
pnpm test:e2e           # Integration tests (testcontainers, requires Docker)

# Run a single test file
pnpm test -- --testPathPattern=projects.service

# Database
pnpx prisma migrate dev        # Apply migrations and regenerate client
pnpx prisma migrate deploy     # Apply migrations (CI/production)
pnpx prisma generate           # Regenerate client without migrating
```

### Required environment variables

Set in `.env` or `.env.local`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | HTTP port (default: 3000) |
| `NODE_ENV` | `development` / `production` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (production only) |

## Architecture

NestJS REST API backed by PostgreSQL via Prisma ORM. All routes are prefixed `api/v1`. Swagger UI is available at `/api/v1/docs` in non-production environments.

### Module layout

Each domain follows a strict structure: `*.controller.ts` → `*.service.ts` → Prisma (no separate repository layer).

| Module | Responsibility |
|---|---|
| `clients` | Manage clients (companies that own projects) |
| `projects` | Manage projects; expose payment progress aggregates |
| `project-reports` | Monthly financial reports per project, including corporation payments |
| `corporations` | Corporations that receive payments from project reports |
| `subcontractors` | Workers assigned to project reports |
| `subcontractor-payments` | Track subcontractor payment status per service month; `amount` is computed dynamically |
| `incomes` | Income-related queries |
| `prisma` | Singleton `PrismaService` extending `PrismaClient` with `@prisma/adapter-pg` |

### Data models

Key entity fields (see `prisma/schema.prisma` for the full schema):

| Entity | Notable fields |
|---|---|
| `Project` | `estimatedAmount` (Decimal), `finishDate` (Date), `description` (required String) |
| `ProjectReport` | `incomeDate?` (nullable — null means income not yet received); unique on `(projectId, date)` |
| `CorporationPayment` | `date?` (nullable payment date) |
| `SubcontractorPayment` | `serviceDate` (Date — the service month's start date, required); `paymentDate?` (nullable — null means unpaid); unique on `(subcontractorId, serviceDate)` |

### Prisma client

The generated Prisma client lives in `src/generated/` (not `node_modules`). Import from `src/generated/client`, not from `@prisma/client`. After schema changes, regenerate with `pnpx prisma generate`.

### Error handling

Domain errors extend the base hierarchy in `src/common/errors/`:
- `EntityError` → base
  - `EntityNotFoundError` → maps to HTTP 404
  - `EntityAlreadyExistsError` → maps to HTTP 409

Each module defines its own typed errors (e.g. `ProjectNotFoundError`, `ClientNotFoundError`) that extend these bases. `EntityExceptionFilter` (registered globally in `main.ts`) intercepts all exceptions and converts them to structured JSON responses.

Services catch `PrismaClientKnownRequestError` and re-throw the appropriate domain error using the codes in `src/common/constants.ts` (`P2002` unique, `P2003` FK, `P2025` not found).

### Mappers

Each module with a non-trivial response shape has a `mappers/` subdirectory containing pure functions that convert Prisma entities to DTOs. Mappers handle `Decimal → number` and `Date → ISO string` conversions. The mapper is the only place these conversions happen — services pass raw Prisma types to mappers.

### ProjectReport enrichment

When creating or updating a `ProjectReport`, `subcontractorId` and `profitMargin` are optional. If either is omitted, the service looks up the previous month's report for the same project and inherits the missing fields. If no previous report exists, it throws `ProjectReportNotFoundError`.

### Financial calculations

**ProjectReport** (computed at read time in `project-reports.service.ts:findOne`, not stored):
- `profit = income × profitMargin / 100`
- `subcontractorPayment = income − profit − Σ(corporationPayments)`

**SubcontractorPayment** — `amount` is not stored; it is computed by summing `subcontractorPayment` across all `ProjectReport` rows matching `(subcontractorId, serviceDate)`.

### Project payment progress

`ProjectResponseDto` includes a `paymentProgress` field computed against `project.estimatedAmount`. `totalPaid` = sum of `ProjectReport.income` where `incomeDate IS NOT NULL`. Fields: `totalPaid`, `remainingAmount` (clamped ≥ 0), `percentagePaid` (0–100, rounded, clamped).

### Testing approach

- **Unit tests** (`*.spec.ts` in `src/`): mock `PrismaService` entirely using `jest.fn()`. No real DB.
- **Integration/e2e tests** (`test/*.e2e-spec.ts`): spin up a real PostgreSQL instance via `@testcontainers/postgresql`, run `prisma migrate deploy`, then test the service directly against the DB.

Pagination defaults (`PAGINATION_DEFAULTS` in `src/common/constants.ts`): page 1, limit 10.
