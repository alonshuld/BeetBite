# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Vite + React 18 + TypeScript (strict). State: Redux Toolkit + RTK Query. Routing: React Router v7 data router. Styling: Tailwind CSS v3 + CSS custom properties. API types: `openapi-typescript` generated from backend Swagger.

## Commands

```bash
pnpm dev          # Vite dev server on :5173 (proxies /api → :3000)
pnpm build        # tsc -b && vite build
pnpm preview      # Preview production build
pnpm typecheck    # tsc -b — checks src (tsconfig.json) and vite.config.ts (tsconfig.node.json)
pnpm lint         # ESLint (auto-fix)
pnpm lint:check   # ESLint (no fix, for CI)
pnpm format       # Prettier write
pnpm test         # Vitest (all files)

# Run single test file
pnpm vitest run src/components/atoms/Button.test.tsx

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
    atoms/                  # Primitive UI: Button variants, Badge, Input, Select, Textarea, Toggle, Divider, EmptyState, SearchInput, StatCard, MonthPicker, FormGroup, LangToggle, PageHeader, ThemeToggle
    molecules/              # Composed but stateless: (currently flat — files in atoms/ re-exported via index), + ImageUploadField (file input → base64 data URL, preview, remove)
    organisms/              # Modal (+ ConfirmModal + FormModal), Sidebar, TopHeader, CompanySettingsForm (shared by onboarding + settings pages)
    AppShell.tsx            # Sidebar + TopHeader + <Outlet />
    RequireAuth.tsx         # Redirects to /login when unauthenticated
    OnboardingGate.tsx      # Redirects to /onboarding once, only if company settings don't exist yet
    ErrorBoundary.tsx       # Catches render errors
  contexts/
    LangContext.tsx         # LangProvider — persists to localStorage (beetbite.lang)
    ThemeContext.tsx        # ThemeProvider — sets data-theme="dark" on <html>
    ToastContext.tsx        # ToastProvider — portal-rendered toasts
    useLang.ts              # Hook: { lang, isRTL, t, setLang }
    useTheme.ts             # Hook: { theme, setTheme }
    useToast.ts             # Hook: { toast(message, variant?) }
    langContext.ts          # createContext + translations object (en/he)
  pages/                    # One file per route, lazy-loaded
  styles/
    globals.css             # :root CSS vars + Tailwind directives + scrollbar + grain
  utils/
    formatMonth.ts          # formatYM(ym, lang, format?) and formatISODate(iso, lang, opts?) — locale-aware date helpers
  router.tsx                # createBrowserRouter route table
  main.tsx                  # Entry point — provider tree
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

Data router via `createBrowserRouter`. All authenticated routes are wrapped in `RequireAuth` (redirects to `/login`). Below that, `/onboarding` is a sibling route rendered full-screen (no `AppShell`, no gate); everything else is wrapped in `OnboardingGate` (redirects to `/onboarding` once, only when `GET /company-settings` returns `null`, i.e. never configured — not a permanent block, just a one-time nudge) and then `AppShell`. Pages are `React.lazy`-loaded.

| Path | Page |
|---|---|
| `/login` | LoginPage (public) |
| `/onboarding` | OnboardingPage (full-screen, no sidebar; "Skip for now" or "Save & Continue") |
| `/` | redirect → `/reports` |
| `/reports` | ReportsPage |
| `/reports/projects/:id` | ProjectReportsPage |
| `/corporation-payments` | CorporationPaymentsPage |
| `/subcontractor-payments` | SubcontractorPaymentsPage |
| `/projects` | ProjectsPage |
| `/clients` | ClientsPage |
| `/subcontractors` | SubcontractorsPage |
| `/corporations` | CorporationsPage |
| `/settings/company` | SettingsCompanyPage |
| `/simulator` | ProfitSimulatorPage |
| `*` | NotFoundPage |

## Styling

Tailwind v3 with `tailwind.config.ts`. All colours map to CSS custom properties declared in `src/styles/globals.css`, which in turn use the oklch palette from the mockup. Use Tailwind utility classes; reach for raw CSS vars only when no utility maps to the token.

Design reference for all visual specs (colours, spacing, component shapes, animations): `apps/frontend/BeetBite.mockup.html`.

## Provider tree

```
ErrorBoundary
  Redux Provider (store)
    ThemeProvider   → data-theme on <html>
      LangProvider  → dir/lang on <html>, beetbite.lang in localStorage
        ToastProvider → portal toasts
          RouterProvider
```

Access via `useLang()`, `useTheme()`, `useToast()` from `@/contexts/use*.ts`. All three hooks throw if used outside their provider.

## Component imports

Import atoms/molecules/organisms by their specific path — e.g.:

```ts
import { Input } from "@/components/atoms/Input";
import { PageHeader } from "@/components/molecules/PageHeader";
import { FormModal, ConfirmModal } from "@/components/organisms/Modal";
```

Barrel import `@/components/atoms` works for atoms only.

## i18n + RTL

Bilingual EN/HE. `LangContext` (`lang`, `t`, `isRTL`, `setLang`) is provided at root in `main.tsx` (above router). Persist selected lang to `localStorage` key `beetbite.lang`. On lang change, set `document.documentElement.dir` to `"rtl"` or `"ltr"`. RTL layout rules are in `globals.css` under `[dir="rtl"]` — no JS layout logic needed.

**Month/date formatting**: always use `formatYM(ym, lang)` and `formatISODate(iso, lang)` from `src/utils/formatMonth.ts` — never hardcode `"en-GB"`. These map `lang` to the correct locale (`en-GB` / `he-IL`) so month names render in the active language.

## Sidebar nav sections

**Overview** (use global month picker in TopHeader): Project Reports, Monthly Income, Corporation Payments, Subcontractors, Income Per Month\*

**Management**: Projects, Clients, Subcontractors, Corporations

**Tools**: Profit Margin Simulator

**Settings**: Company Settings (`/settings/company`)

\* Income Per Month does not use the global month picker — exclude from `OVERVIEW_SCREENS`.

## Key design decisions

- **Project completion %**: `sum of reports with incomeDate ÷ project.estimatedAmount`. Shown as 6px progress bar across Projects page, Project Detail, and Income Per Month.
- **Subcontractor overpay guard**: block save in AddInstalmentModal if `totalPaid + newAmount > subcontractor.agreedAmount`.
- **Subcontractor company number**: required, unique, exactly 9 digits (Israeli company registration number). `SubcontractorsPage` strips non-digits and caps input length at 9 on change (`value.replace(/\D/g, "").slice(0, 9)`) rather than only relying on `pattern`/`maxLength`.
- **Corporation payment fields**: `amount`, `description`, `date`, `isFuture` (bool), `vatPercentage` (number, default 18, shown only when `isFuture = false`).
- **Project filters** (three independent toggles, Active on by default): Active (`isDone=false` + has reports), Future (no reports yet), Closed (`isDone=true`).
- **ProjectReportFormModal flow**: client picker → filtered project list → subcontractor prefills from last month → completion % prefills from last month → report month → income + date → profit margin % → corporation payments (multi-row).
- **Date display in reports**: month + year only (`MMM YYYY`), no day. Use `formatISODate(iso, lang)` — locale-aware.
- **MonthPicker**: click the label to open a popover with a year `<select>` (±10 years) and a 3×4 month button grid. No prev/next arrows. Month names in the picker also respect `lang` via `MONTH_NAMES[lang]` arrays defined in the component.
- **Profit Simulator**: read-only, no API writes. Uses already-loaded RTK Query data.
- **Company Settings onboarding**: `OnboardingGate` checks `useGetCompanySettingsQuery()`; `data === null` (RTK Query's default json handler turns an empty response body into `null` — this is how the backend signals "not configured yet") means redirect to `/onboarding`. Both "Skip for now" and "Save & Continue" call the same `PUT /company-settings` (even with an empty body), so the row always ends up existing afterward and the redirect never fires again. Logo/signature are read via `FileReader.readAsDataURL` into base64 strings — no upload endpoint.

## Path alias

`@/` maps to `src/`. Import as `import Foo from '@/components/Foo'`.
