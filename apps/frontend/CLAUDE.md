# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Vite + React 19 + TypeScript (strict). State: Redux Toolkit + RTK Query. Routing: React Router v7 data router. Styling: Tailwind CSS v4 + CSS custom properties. API types: `openapi-typescript` generated from backend Swagger.

## Commands

```bash
pnpm dev          # vp dev — Vite dev server on :5173 (proxies /api → :3000)
pnpm build        # vp build
pnpm preview      # vp preview — preview production build
pnpm test         # vp test run — Vitest (all files)
# Format, lint and type check run from the repo root (`pnpm check`), see the root CLAUDE.md → Tooling (Vite+)

# Run single test file
pnpm exec vp test run src/components/atoms/Button.test.tsx

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
    molecules/              # Composed but stateless: (currently flat — files in atoms/ re-exported via index), + ImageUploadField (file input → base64 data URL, preview, remove), ColorField, FontField (PDF font picker with a live preview, loading the picked font from Google Fonts on demand)
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
  hooks/
    useFieldCheck.ts        # Save guard that toasts which fields are missing/invalid
  pages/                    # One file per route, lazy-loaded
  styles/
    globals.css             # Tailwind import + @theme tokens, :root CSS vars, base type, focus, scrollbar
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
- API errors: `baseQueryWithReauth` emits an `ApiError` (`status`, English `message`, `code`, `params`) through `errorEmitter`; `AppShell` toasts it via `describeApiError` (`src/api/apiErrors.ts`). Hebrew uses the `hebrewApiErrors` table by code (never the server's English — unknown codes fall back to a status-based line); English shows the server message. Add a Hebrew entry for every new backend error code.
- Validation errors: the backend answers a rejected body with code `VALIDATION_FAILED` and `params.missing` / `params.invalid` (comma-separated field paths). `describeApiError` turns those into "Fill in the required fields: Description, Location" in either language via the label map in `src/api/fieldLabels.ts` — add a field there when a DTO gains one the user types.
- Form guards: a save handler must never `return` silently on bad input. Use `useFieldCheck()` (`src/hooks/useFieldCheck.ts`): `if (!checkFields([[t("name"), !name.trim() && "missing"]])) return;` — it toasts the field labels and returns false. Error toasts stay up 8s (others 3s).

## Routing

Data router via `createBrowserRouter`. All authenticated routes are wrapped in `RequireAuth` (redirects to `/login`). Below that, `/onboarding` is a sibling route rendered full-screen (no `AppShell`, no gate); everything else is wrapped in `OnboardingGate` (redirects to `/onboarding` once, only when `GET /company-settings` returns `null`, i.e. never configured — not a permanent block, just a one-time nudge) and then `AppShell`. Pages are `React.lazy`-loaded.

| Path | Page |
|---|---|
| `/login` | LoginPage (public) |
| `/onboarding` | OnboardingPage (full-screen, no sidebar; "Skip for now" or "Save & Continue") |
| `/` | redirect → `/reports` |
| `/reports` | ReportsPage |
| `/reports/projects/:id` | ProjectReportsPage |
| `/supplier-payments` | SupplierPaymentsPage |
| `/subcontractor-payments` | SubcontractorPaymentsPage |
| `/projects` | ProjectsPage |
| `/clients` | ClientsPage |
| `/subcontractors` | SubcontractorsPage |
| `/suppliers` | SuppliersPage |
| `/settings/company` | SettingsCompanyPage |
| `*` | NotFoundPage |

## Styling

Tailwind v4 through the `@tailwindcss/vite` plugin; there is no `tailwind.config.ts` or PostCSS config. The theme lives in the `@theme` blocks at the top of `src/styles/globals.css`, and every colour there maps to a runtime CSS custom property declared further down (light + `[data-theme="dark"]`). Use Tailwind utility classes; reach for raw CSS vars only when no utility maps to the token (`bg-(--bg)`).

Cascade rules worth knowing (v4 puts utilities in a native CSS layer, and unlayered CSS beats any layer):
- Element-level base styles (the reset, `html`/`body`, `h1–h3`) live in `@layer base`, so utilities override them.
- Rules that must beat utilities (the global `:focus-visible` ring, `[dir="rtl"] th/td` alignment, native control sizing) are deliberately unlayered. Don't move them into a layer.
- Opacity modifiers accept any number (`bg-success/12`), unlike v3 which only had steps of 5. Conflicting utilities on one element (`h-9` from a component plus `h-11` from the caller) resolve by numeric order, not v3's order, so pass overrides that don't collide.

### Design system

- **Palette.** Every neutral sits on the beet hue (350) with real chroma, so paper, rules and ink read as tints of the brand rather than grey with an accent dropped on top. The app is pink on purpose. The exported account-approval PDF is the formal document and keeps its own restrained palette — screens do not imitate it.
- **Accent vs. money.** `--beet` marks what you can *act on* (buttons, nav, focus). It never states an amount. Money has its own scale: `--success` for received/settled, `--warning` for pending or part-settled, plain ink for amounts outstanding or leaving. Owing money is the normal state of this business, so it is never coloured as an error; `--danger` is reserved for destructive actions and real faults.
- **Type.** `Frank Ruhl Libre` (serif) for page, section and modal titles via `font-serif` and the base `h1–h3` rule; `Assistant` for everything else. Both carry full Hebrew. Sizes come from the named scale in the `@theme` block of `globals.css` (`micro`/`label`/`sm`/`base`/`lead`/`title`/`page`/`hero`) rather than arbitrary pixel values.
- **No ALL-CAPS labels.** Hebrew has no uppercase, so `uppercase` silently applied to only half the UI and the two languages rendered as different products. Labels are sentence case at `text-label`.
- **Icons.** `components/atoms/Icon.tsx` — one hand-drawn stroke set on a 24-unit grid, plus `BeetMark` for the product mark. Never emoji: they ignore `currentColor`, can't dim with muted text, and render differently per OS. Each renders `data-icon={name}`, which is how tests assert on them.
- **Surfaces.** Cards and tables get a border, never a shadow; shadow (`shadow-pop`, `shadow-modal`) is reserved for things that genuinely float. `rounded-lg` for panels, `rounded`/`rounded-sm` for controls.
- **Money figures.** Set in containers carrying `.tnum` (or any `table`, which opts in via `globals.css`) so digits stay on their vertical rails. Wrap an amount in `dir="ltr"` when a sign is attached — otherwise bidi pushes the minus to the far side of the number in RTL.
- **Statement rows.** `components/molecules/Statement.tsx` renders the money screens' shared shape, where rule weight is arithmetic: `StatementRule` (single) closes a subtotal, `StatementTotalRule` (double) closes the figure the sheet was computing.
- **RTL.** Prefer logical properties (`ps-`/`pe-`/`ms-`/`me-`/`text-start`/`text-end`) over `ltr:`/`rtl:` pairs.
- **Motion.** Reserved for what answers an action (modal open, dropdown). `prefers-reduced-motion` is honoured globally in `globals.css`.

`apps/frontend/BeetBite.mockup.html` is the **superseded** pre-redesign mockup. Do not use it as a visual reference; `globals.css` plus the components are the source of truth.

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

**Overview** (use global month picker in TopHeader): Project Reports, Turnover Summary (ריכוז מחזורי), Supplier Payments, Subcontractors, Income Per Month\*

**Management**: Projects, Clients, Subcontractors, Suppliers

**Settings**: Company Settings (`/settings/company`)

\* Income Per Month does not use the global month picker — exclude from `OVERVIEW_SCREENS`.

## Key design decisions

- **Project completion %**: `sum of reports with incomeDate ÷ project.estimatedAmount`. Shown as 6px progress bar across Projects page, Project Detail, and Income Per Month.
- **Subcontractor overpay guard**: block save in AddInstalmentModal if `totalPaid + newAmount > subcontractor.agreedAmount`.
- **Subcontractor teams**: managed in `components/organisms/TeamsModal` (one modal that swaps between the team list and the member picker — no stacked modals), opened by a "Teams" button on both `SubcontractorsPage` and `SubcontractorPaymentsPage`. `utils/subcontractorTeams.ts` has `teamLabel` (members joined with " + ") and `teamsByMember`. `SubcontractorPaymentsPage` groups a team's members onto one card keyed by team id, adds a "Taken by" select per project (`useChangeReportSubcontractorMutation`, disabled once that project has instalments), and its footer shows per-member owed/paid plus the team total. Payments are always recorded to the project's member (the report's subcontractor).
- **Turnover summary (ריכוז מחזורי, `MonthlyIncomePage`, `/income`)**: groups the month by client or by requester (segmented "Group by" control; requester names are matched trimmed and case-insensitively). Each project row: project, requester (in both groupings), price, VAT checkbox + amount (`useSetIncomeVatMutation`; ⚠ when the month has no VAT rate), total incl. VAT, received, the same ✕ / ✓ / 〜 status circles as subcontractor payments, profit. Payments are dated lines under the row (date editable on blur, deletable); ✓ pre-fills the outstanding balance, 〜 opens an empty amount, ✕ deletes all of the month's payments. Endpoints in `api/endpoints/income.ts`; payment mutations also invalidate `Projects` (payment progress).
- **Subcontractor company number**: required, unique, exactly 9 digits (Israeli company registration number). `SubcontractorsPage` strips non-digits and caps input length at 9 on change (`value.replace(/\D/g, "").slice(0, 9)`) rather than only relying on `pattern`/`maxLength`.
- **Supplier payment fields**: `amount`, `description`, `date`, `isFuture` (bool), `includesVat` (bool).
- **Supplier payment VAT**: the user only chooses *whether* a payment carries VAT — a checkbox per row on `SupplierPaymentsPage` (`PATCH /suppliers/payments/:id/vat` via `useSetSupplierPaymentIncludesVatMutation`) and a per-line switch in `SupplierPaymentsBatchModal` (default on). The percentage is never typed: the backend derives it from the global VAT rate for the report's month and returns it read-only as `vatPercentage`. The page shows it beside the checkbox (⚠ when VAT is on but that month has no rate yet); the modal shows the rate that will apply to its month.
- **Project filters** (three independent toggles, Active on by default): Active (`isDone=false` + has reports), Future (no reports yet), Closed (`isDone=true`).
- **Profit simulator**: lives on `ReportsPage`'s client drill-down as a drawer (`components/organisms/ProfitSimulatorPanel`, state in `features/simulator/useProfitSimulation`). **Closed by default** — a bookmark tab pinned to the edge opposite the sidebar (right in LTR, left in RTL) opens it, then rides out with the drawer and closes it — one handle, no ✕; closing it (handle or Esc) resets the simulation, so the page shows stored figures unless the user is actively simulating. It slides in from that edge (`fixed top-14`, below the app header, `transition-transform duration-200`, kept mounted for the slide-out) and from `md` up the page content is inset by `md:pe-[356px]` over the same 200ms, so the drawer pushes the sheets aside instead of covering them; below `md` there is no room to push, so it overlays. No backdrop — the sheets stay readable while a slider is dragged. Each row pairs a slider (0–20%, where margins actually land) with a number box (0–100%) for the rare margin above the track — the thumb parks at 20 then. A master slider sets one margin for every project; moving a project's own slider pins it, so later master moves skip it. Effective margin = pin → master → saved, with the master resting at the average saved margin until moved. Everything on the page reads it — project sheets (marked "Simulated", saved figure beneath) and the client header's Total Sub Payments — but nothing is written back; the only consumer is the client-simulated PDF export, which receives just the projects whose margin actually differs. Clears on client or month change.
- **Payments above income**: supplier payments may exceed a report's income (the subcontractor remainder goes negative), but every save that would put or push a report there asks first — `useOverIncomeConfirm` (`hooks/`) with `goesOverIncome` (`utils/paymentsOverIncome.ts`), compared in agorot. Wired into the add-report modals (`ReportsPage`, `ProjectReportsPage`), the edit-report modal, `ProjectReportsPage`'s inline income/supplier edits and removals, `SupplierPaymentsBatchModal` (lines summed per report) and `SupplierPaymentEditModal`. A save that leaves an already-over report no worse does not ask again. The warning is a `ConfirmModal` (`tone="primary"`, `confirmLabel`) stacked over the form; `Modal`'s Escape closes only the top-most dialog.
- **Income is optional** in the report forms: an empty amount is saved as 0, a fully empty row is dropped, and an existing row emptied in the edit modal is updated to 0 rather than deleted (`utils/incomeEntryDraft.ts`).
- **ProjectReportFormModal flow**: client picker → filtered project list → subcontractor prefills from last month → completion % prefills from last month → report month → income + date → profit margin % → supplier payments (multi-row).
- **Date display in reports**: month + year only (`MMM YYYY`), no day. Use `formatISODate(iso, lang)` — locale-aware.
- **MonthPicker**: click the label to open a popover with a year `<select>` (±10 years) and a 3×4 month button grid. No prev/next arrows. Month names in the picker also respect `lang` via `MONTH_NAMES[lang]` arrays defined in the component.
- **Profit Simulator**: read-only, no API writes. Uses already-loaded RTK Query data.
- **Company Settings onboarding**: `OnboardingGate` checks `useGetCompanySettingsQuery()`; `data === null` (RTK Query's default json handler turns an empty response body into `null` — this is how the backend signals "not configured yet") means redirect to `/onboarding`. Both "Skip for now" and "Save & Continue" call the same `PUT /company-settings` (even with an empty body), so the row always ends up existing afterward and the redirect never fires again. Logo/signature are read via `FileReader.readAsDataURL` into base64 strings — no upload endpoint.

## Path alias

`@/` maps to `src/`. Import as `import Foo from '@/components/Foo'`.
