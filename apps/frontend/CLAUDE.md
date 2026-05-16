# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Vite + React 18 + TypeScript (strict). State: Redux Toolkit + RTK Query. Routing: React Router v7 data router. Styling: Tailwind CSS v3 + CSS custom properties. API types: `openapi-typescript` generated from backend Swagger.

## Commands

```bash
pnpm dev          # Vite dev server on :5173
pnpm build        # tsc -b && vite build
pnpm preview      # Preview production build
pnpm typecheck    # tsc --noEmit
pnpm lint         # ESLint (auto-fix)
pnpm test         # Vitest

# API type generation — requires backend running on :3000
pnpm codegen
BACKEND_URL=http://localhost:4000 pnpm codegen   # override URL
```

## Directory layout

```
src/
  api/
    baseApi.ts              # RTK Query base with auth header + 401 reauth
    endpoints/              # One injected slice per backend module
    generated/
      schema.d.ts           # Auto-generated — do not edit by hand
  app/
    store.ts                # Redux store
    hooks.ts                # Typed useAppDispatch / useAppSelector
  features/
    auth/
      authSlice.ts          # JWT token in localStorage (key: beetbite.token)
  components/
    AppShell.tsx            # Sidebar + TopHeader + <Outlet />
    RequireAuth.tsx         # Redirects to /login when unauthenticated
  pages/                    # One file per route, lazy-loaded
  styles/
    globals.css             # :root CSS vars + Tailwind directives + scrollbar + grain
  router.tsx                # createBrowserRouter route table
  main.tsx                  # Entry point
scripts/
  codegen.mjs               # Fetches OpenAPI JSON and writes schema.d.ts
```

## API types

`src/api/generated/schema.d.ts` is generated from the backend's OpenAPI spec at `/api/v1/docs-json`.
Re-run `pnpm codegen` whenever backend DTOs change. The backend must be running first.

## State management

- `baseApi` (RTK Query): `baseUrl = '/api/v1'`, `prepareHeaders` attaches `Authorization: Bearer <token>` from Redux auth state.
- `baseQueryWithReauth`: wraps base query; dispatches `logout()` on 401.
- `authSlice`: persists JWT to `localStorage` under key `beetbite.token`.
- Endpoint slices under `src/api/endpoints/` are injected into `baseApi`.

## Routing

Data router via `createBrowserRouter`. All authenticated routes are wrapped in `RequireAuth` (redirects to `/login`) and rendered inside `AppShell`. Pages are `React.lazy`-loaded.

| Path | Page |
|---|---|
| `/login` | LoginPage (public) |
| `/` | redirect → `/reports` |
| `/reports` | ReportsPage |
| `/reports/projects/:id` | ProjectReportsPage |
| `/income` | IncomePage |
| `/income-per-month` | IncomePerMonthPage |
| `/corporation-payments` | CorporationPaymentsPage |
| `/subcontractor-payments` | SubcontractorPaymentsPage |
| `/projects` | ProjectsPage |
| `/clients` | ClientsPage |
| `/subcontractors` | SubcontractorsPage |
| `/corporations` | CorporationsPage |
| `/simulator` | ProfitSimulatorPage |
| `*` | NotFoundPage |

## Styling

Tailwind v3 with `tailwind.config.ts`. All colours map to CSS custom properties declared in `src/styles/globals.css`, which in turn use the oklch palette from the mockup. Use Tailwind utility classes; reach for raw CSS vars only when no utility maps to the token.

Design reference for all visual specs (colours, spacing, component shapes, animations): `apps/frontend/BeetBite.mockup.html`.

## i18n + RTL

Bilingual EN/HE. `LangContext` (`lang`, `t`, `isRTL`) lives in `AppShell` and is provided above the login page too. Persist selected lang to `localStorage` key `beetbite.lang`. On lang change, set `document.documentElement.dir` to `"rtl"` or `"ltr"`. RTL layout rules are in `globals.css` under `[dir="rtl"]` — no JS layout logic needed.

## Sidebar nav sections

**Overview** (use global month picker in TopHeader): Project Reports, Monthly Income, Corporation Payments, Subcontractors, Income Per Month\*

**Management**: Projects, Clients, Subcontractors, Corporations

**Tools**: Profit Margin Simulator

\* Income Per Month does not use the global month picker — exclude from `OVERVIEW_SCREENS`.

## Key design decisions

- **Project completion %**: `sum of reports with incomeDate ÷ project.estimatedAmount`. Shown as 6px progress bar across Projects page, Project Detail, and Income Per Month.
- **Subcontractor overpay guard**: block save in AddInstalmentModal if `totalPaid + newAmount > subcontractor.agreedAmount`.
- **Corporation payment fields**: `amount`, `description`, `date`, `isFuture` (bool), `vatPercentage` (number, default 18, shown only when `isFuture = false`).
- **Project filters** (three independent toggles, Active on by default): Active (`isDone=false` + has reports), Future (no reports yet), Closed (`isDone=true`).
- **ProjectReportFormModal flow**: client picker → filtered project list → subcontractor prefills from last month → completion % prefills from last month → report month → income + date → profit margin % → corporation payments (multi-row).
- **Date display in reports**: month + year only (`MMM YYYY`), no day.
- **Profit Simulator**: read-only, no API writes. Uses already-loaded RTK Query data.

## Path alias

`@/` maps to `src/`. Import as `import Foo from '@/components/Foo'`.
