# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This project uses `pnpm` as package manager

## Commands

```bash
# Development
pnpm start:dev          # Start with hot reload
pnpm build              # Compile TypeScript via NestJS CLI
pnpm start:prod         # Run compiled output

# Code quality
pnpm lint               # ESLint + tsc (auto-fix)
pnpm lint:check         # ESLint + tsc (no fix, for CI)
pnpm typecheck          # tsc --noEmit only
pnpm format             # Prettier write
pnpm format:check       # Prettier check (no write)

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
pnpx prisma db seed            # Seed admin user + optional mock data
```

### Required environment variables

Set in `.env` or `.env.local` (`.env.local` takes precedence):

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens — **required**, app throws on startup if missing |
| `PORT` | HTTP port (default: 3000) |
| `NODE_ENV` | `development` / `production` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (production only) |
| `JWT_EXPIRES_IN` | Token TTL (default: `24h`) |
| `ADMIN_USERNAME` | Seed admin username (default: `admin`) |
| `ADMIN_PASSWORD` | Seed admin password — **required** when running `prisma db seed` |

## Architecture

NestJS REST API backed by PostgreSQL via Prisma ORM. All routes are prefixed `api/v1`. Swagger UI is available at `/api/v1/docs` in non-production environments.

### Module layout

Each domain follows a strict structure: `*.controller.ts` → `*.service.ts` → Prisma (no separate repository layer).

| Module | Responsibility |
| --- | --- |
| `auth` | JWT + Passport auth; `POST /auth/login` issues tokens; global `JwtAuthGuard` protects all routes |
| `users` | User lookup by username/id; used internally by auth strategies |
| `clients` | Manage clients (companies that own projects) |
| `projects` | Manage projects; expose payment progress aggregates |
| `project-reports` | Monthly financial reports per project, including corporation payments |
| `corporations` | Corporations that receive payments from project reports |
| `subcontractors` | Workers assigned to project reports |
| `subcontractor-payments` | Track partial payments made to subcontractors per service month; enforces overpayment guard against computed amount owed per project; exposes `GET /by-client?month=` aggregation endpoint |
| `prisma` | Singleton `PrismaService` extending `PrismaClient` with `@prisma/adapter-pg` |

### Authentication

`JwtAuthGuard` is registered as a global `APP_GUARD` in `AppModule` — every route requires a valid Bearer token by default. To exempt a route, apply `@Public()` from `src/auth/decorators/public.decorator.ts`.

Flow:
1. `POST /api/v1/auth/login` — `@Public()`, `LocalAuthGuard` runs Passport local strategy (username + bcrypt password check via `UsersService`)
2. On success, `AuthService.login()` signs a JWT with payload `{ sub: userId, username }`
3. Client sends `Authorization: Bearer <token>`; `JwtStrategy` validates and attaches `{ userId, username }` to `req.user`

Users are stored in the `User` model with a `passwordHash` (bcrypt, 12 rounds). Create/update users via `prisma db seed` or directly via Prisma.

### Data models

Key entity fields (see `prisma/schema.prisma` for the full schema):

| Entity | Notable fields |
| --- | --- |
| `Subcontractor` | `name` (unique); `companyNumber` (unique String, exactly 9 digits — Israeli company registration number, validated via `@IsNumberString({ no_symbols: true }) @Length(9, 9)`) |
| `Project` | `estimatedAmount` (Decimal), `description` (required String), `isDone` (Boolean, default false — marks project as closed) |
| `ProjectReport` | `incomeDate?` (nullable — null means income not yet received); unique on `(projectId, date)` |
| `CorporationPayment` | `date?` (nullable payment date); `description?` (optional String); `isFuture` (Boolean, default false — true means not yet invoiced); `vatPercentage?` (Decimal — only applicable when `isFuture` is false, defaults to 18%) |
| `SubcontractorPayment` | `projectId` (String — required, payment must be assigned to a project); `serviceDate` (Date — the service month's start date, required); `amount` (Decimal, stored — caller-supplied partial payment amount); multiple records per `(subcontractorId, projectId, serviceDate)` allowed; no `paymentDate` — all payments are always considered paid |

### Prisma client

The generated Prisma client lives in `src/generated/` (not `node_modules`). Import from `src/generated/client`, not from `@prisma/client`. After schema changes, regenerate with `pnpx prisma generate`.

### Validation

Global `ValidationPipe` is configured with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`, and `enableImplicitConversion: true`. All DTO properties must be decorated with `class-validator` decorators; extra properties are rejected with 400. Error messages are suppressed in production.

### Error handling

Domain errors extend the base hierarchy in `src/common/errors/`:

- `EntityError` → base
- `EntityNotFoundError` → maps to HTTP 404
- `EntityAlreadyExistsError` → maps to HTTP 409

Each module defines its own typed errors (e.g. `ProjectNotFoundError`, `ClientNotFoundError`) that extend these bases. `EntityExceptionFilter` (registered globally in `main.ts`) intercepts all exceptions and converts them to structured JSON responses.

Services catch `PrismaClientKnownRequestError` and re-throw the appropriate domain error using the codes in `src/common/constants.ts` (`P2002` unique, `P2003` FK, `P2025` not found).

`SubcontractorPaymentOverpaymentError` (extends `BadRequestException`) accepts an optional `paymentId` fourth argument — pass it on `update` so the error message identifies which payment triggered the violation.

`SubcontractorAlreadyExistsError` accepts an optional `field` second argument (defaults to `'name'`) — `subcontractors.service.ts` inspects the Prisma unique-constraint error's `meta.target` to pass `'companyNumber'` when that field (rather than `name`) triggered the conflict.

### Mappers

Each module with a non-trivial response shape has a `mappers/` subdirectory containing pure functions that convert Prisma entities to DTOs. Mappers handle `Decimal → number` and `Date → ISO string` conversions. The mapper is the only place these conversions happen — services pass raw Prisma types to mappers.

**Important:** Always use explicit field picks in mapper return objects — never spread a Prisma model directly (e.g. `...projectReport`). Prisma models contain internal FK fields (`projectId`, `subcontractorId`) and nested relation arrays that are not part of the DTO shape and will leak into responses if spread. Pick only the fields declared in the target DTO.

### ProjectReport enrichment

When creating or updating a `ProjectReport`, `subcontractorId` and `profitMargin` are optional. If either is omitted, the service looks up the previous month's report for the same project and inherits the missing fields. If no previous report exists, it throws `ProjectReportNotFoundError`.

### Financial calculations

**ProjectReport** (computed at read time in `project-reports.service.ts:findOne`, not stored):

- `profit = income × profitMargin / 100`
- `subcontractorPayment = income − profit − Σ(corporationPayments)`

**SubcontractorPayment** — `amount` is stored (provided by the caller). Multiple partial payments per `(subcontractorId, projectId, serviceDate)` are allowed. On `create` and `update`, the service computes `amountOwed` for the specific project (not across all projects for the month) and rejects the payment if `Σ(existing payments for that project) + newAmount > amountOwed`. The overpayment check and the DB write are executed inside a single `$transaction` to prevent race conditions — do not split them into separate steps.

### Project payment progress

`ProjectResponseDto` includes a `paymentProgress` field with a single field: `totalPaid` = sum of `ProjectReport.income` where `incomeDate IS NOT NULL`. The frontend derives `remainingAmount` and `percentagePaid` from `totalPaid` and the project's `estimatedAmount`.

### Project filters

`GET /projects` accepts optional boolean query params `active` (default true), `future`, and `closed`, plus an optional `clientId` string:

- `active` — `isDone = false` AND has at least one project report
- `future` — no project reports yet
- `closed` — `isDone = true`
- `clientId` — filter to a specific client's projects

Filters are independent and combinable. Default view (no params) returns active projects only.

### Income Per Month

`GET /incomes/all-months` returns all project reports grouped by month. Each entry includes `income`, `incomeStatus` (`pending` when `incomeDate` is null, `paid` otherwise), and `completionPercent` (`totalPaidIncome / estimatedAmount × 100`).

### Testing approach

- **Unit tests** (`*.spec.ts` in `src/`): mock `PrismaService` entirely using `jest.fn()`. No real DB.
- **Integration/e2e tests** (`test/*.e2e-spec.ts`): spin up a real PostgreSQL instance via `@testcontainers/postgresql`, run `prisma migrate deploy`, then test the service directly against the DB.

Pagination defaults (`PAGINATION_DEFAULTS` in `src/common/constants.ts`): page 1, limit 10.
