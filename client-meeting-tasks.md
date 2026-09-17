# BeetBite — client meeting tasks

Every task below traces to a specific meeting note and a decision the product
owner gave explicitly. Where a decision has a consequence the owner did not
state in so many words, that consequence is called out rather than assumed.

**Nothing in this backlog changes an existing financial calculation.** If a
change you are making moves a number that is already computed today, stop —
you have misread the task.

**Every task ships with tests.** See *Testing — the definition of done* below,
and the per-task **Tests** section in each task.

All file and line references verified against commit `183147c` (current `dev`).

---

## Conventions for whoever implements these

- Monorepo: `apps/backend` (NestJS + Prisma), `apps/frontend` (Vite + React +
  RTK Query), `apps/e2e` (Playwright). Read the per-app `CLAUDE.md` first.
- All routes are prefixed `api/v1`.
- After **any** backend DTO change run `pnpm --filter frontend codegen`
  (backend must be running).
- Pre-commit runs `pnpm format:check` then `pnpm lint:check`. Run
  `pnpm format && pnpm lint` before committing.
- UI is bilingual he/en via `apps/frontend/src/contexts/langContext.ts`. Every
  user-facing string needs **both** locales. Hebrew is RTL — check `rtl:`
  Tailwind variants on anything laid out horizontally.
- Money is `Decimal(12,2)` in Prisma, `number` over the wire.
- There is **no real production data yet**. Migrations may be destructive where
  that produces a cleaner schema — but see the T1 warning about migration
  checksums, which is a build problem, not a data problem.

---

## Testing — the definition of done

**No task in this backlog is complete without tests.** A PR that changes
behaviour and adds no test is not finished, however obviously correct it looks.

Each task below carries its own **Tests** section naming the cases that matter.
Those are the minimum, not the ceiling.

### The repo's existing conventions — follow them, do not invent new ones

| layer | tool | location | existing |
|---|---|---|---|
| Backend unit | Jest (`*.spec.ts`) | colocated with the source | 13 service, 10 controller, 4 mapper specs |
| Frontend unit | Vitest + Testing Library (`*.test.tsx`) | colocated | 38 files — components **and** pages |
| End-to-end | Playwright (`*.spec.ts`) | `apps/e2e/tests/` | 15 specs, **one per domain area** |

- `pnpm test` runs backend Jest + frontend Vitest. `pnpm test:e2e` needs Docker.
- Backend Jest has `rootDir: src`, `testRegex: .*\.spec\.ts$`, and the
  `^src/(.*)$` module mapper. Frontend Vitest runs jsdom with
  `src/test/setup.ts` and the `@` alias.
- **A new backend module needs a service spec and a controller spec**, plus a
  mapper spec if it has a mapper. That is the established pattern — match it.
- **A new domain area needs its own e2e spec file.** T7 (initiators) and T14
  (project transfer) each introduce one.
- e2e tests get a real Postgres testcontainer and truncate all tables after each
  test via `fixtures/db.fixture.ts`. Use it rather than mocking at that layer.

### What actually needs covering

1. **The behaviour the client asked for** — the thing in the note, proven to work.
2. **Every "must not change" claim in an Acceptance section.** Several tasks here
   assert that an existing number stays identical. Those need a test that would
   fail if it moved — otherwise the claim is decoration. This applies hardest to
   **T7**, **T6**, **T12** and **T14**.
3. **Validation and error paths**, not just the happy path.
4. **Both locales** wherever a task adds user-facing strings, since every one of
   them must exist in he and en.

### Coverage

No coverage thresholds are configured, and this backlog does not add any —
chasing a percentage rewards testing trivia. Judge a PR on whether the cases
below are covered, not on a number.

---

## T0 — Project search ✅ ALREADY DONE

**Note:** *"חיפוש פרוייקטים בדף פרוייקטים"* (20:02)

Shipped in `183147c`, already on `dev`. `ProjectsPage` has a search box matching
project name + client name, composing with the status filters. Clients,
Corporations and Subcontractors pages got the same treatment.

**No work required.** Listed so it is not re-implemented.

---

## T1 — Rename `Corporation` → `Supplier` (full stack) + relabel UI

**Note:** *"לשנות חברות לכוח אדם / ספקים"* (20:28, edited)

**Decisions:** UI wording only — no `type` field, no category split. Separately:
do the **full code + database rename now**, while there is no real data.
Identifier: **`Supplier`**.

**Size:** L (mechanical) · **Risk:** low but wide
**⚠️ MERGE THIS FIRST — it gates T5 and T7.**

### Why now

No production data removes the only serious objection to a physical table
rename. `Corporation` was never good English for "a specialist firm you pay
monthly". `Supplier` covers both halves of *כוח אדם / ספקים* — a manpower agency
supplies labour — and collides with nothing else in the domain: `Client`,
`Project`, `Subcontractor`, `Initiator`.

### Sequencing

- **T5** substantially rewrites `CorporationPaymentsPage`.
- **T7** creates `InitiatorPayment` modelled on `CorporationPayment`.

Land this first or both get done twice. Everything else is independent of it.

### Scope (measured, not estimated)

| area | files | occurrences |
|---|---:|---:|
| `apps/backend/src` (hand-edited) | 47 | 1053 |
| `apps/frontend/src` (hand-edited) | 19 | 360 |
| `apps/backend/prisma` | 6 | 139 |
| `apps/e2e` | 5 | 61 |
| **hand-edited total** | **77** | **1613** |
| `src/generated` + `api/generated` | — | 1789 (**free** — regenerated) |

Nearly half the raw grep count regenerates itself. Do not hand-edit either
generated tree.

### 🚨 The trap that will break the build

**Prisma stores a checksum of every applied migration.** A blind find-and-replace
across the repo rewrites `apps/backend/prisma/migrations/*/migration.sql`,
silently invalidates those checksums, and `prisma migrate deploy` then fails —
including inside the e2e `global-setup.ts`, which runs it against a fresh
testcontainer on every run.

**Exclude `apps/backend/prisma/migrations/**` from every substitution.** Historic
migrations are immutable history. Rename tables with a *new* migration. The two
existing `_init` migrations stay byte-for-byte.

### Work

1. **Schema** — `model Corporation` → `Supplier`, `model CorporationPayment` →
   `SupplierPayment`, field `corporationId` → `supplierId`, relation fields, and
   the `@@map` targets (`"suppliers"`, `"supplier_payments"`). Update
   `ProjectReport.corporationPayments` → `supplierPayments`.
2. **New migration**, hand-written — do not let Prisma drop/recreate:
   ```sql
   ALTER TABLE "corporations" RENAME TO "suppliers";
   ALTER TABLE "corporation_payments" RENAME TO "supplier_payments";
   ALTER TABLE "supplier_payments" RENAME COLUMN "corporationId" TO "supplierId";
   ```
   Plus the constraint and index renames Postgres does not carry over. Confirm
   with `prisma migrate diff` that schema and migration agree.
3. **Backend code** — four case variants (`corporation`, `Corporation`,
   `corporations`, `Corporations`) across `apps/backend/src`, **excluding
   `src/generated` and `prisma/migrations`**. Then `git mv` the directories
   `src/corporations` → `src/suppliers` and `src/corporation-payments` →
   `src/supplier-payments`, plus the ~30 files beneath them. Also the three
   `project-reports/dto/*corporation*.ts` files.
4. **REST paths** — `/corporations/payments`,
   `/corporations/payments/:id`, `/corporations/:corporationId/payments` → the
   `suppliers` equivalents. **Safe to break:** the SPA is the only consumer and
   ships in the same `docker-compose`.
5. **Frontend** — `api/endpoints/corporations.ts`, `corporation-payments.ts`,
   `CorporationsPage.tsx`, `CorporationPaymentsPage.tsx` (+ tests), `router.tsx`,
   `Sidebar.tsx`. Routes `/corporations` → `/suppliers`, `/corporation-payments`
   → `/supplier-payments`.
6. **Seeds** — `prisma/seed.ts`, `seed-demo-he.ts`.
7. **e2e** — `git mv` both spec files; check the fixture truncation order.
8. **Regenerate** — `prisma generate`, then `pnpm --filter frontend codegen`.
9. **UI labels** — in `langContext.ts`:

| key | he | en |
|---|---|---|
| `suppliers` | `כוח אדם / ספקים` | `Manpower / Suppliers` |
| `supplierPayments` | `תשלומי כוח אדם / ספקים` | `Manpower / Supplier Payments` |
| `supplier` | `כוח אדם / ספק` | `Manpower / Supplier` |
| `suppliersSubtitle`, `supplierNamePlaceholder`, `noSuppliersYet`, `addFirstSupplierHint`, `noSupplierPaymentsFor`, `supplierPaymentsNote` | reword | reword |

### Verification

```
grep -rn "orporation" apps --include=*.ts --include=*.tsx --include=*.prisma \
  | grep -v node_modules | grep -v "prisma/migrations" \
  | grep -v "src/generated" | grep -v "api/generated"
```

Must return nothing. Then `pnpm lint`, `pnpm test`, `pnpm test:e2e` — the e2e
suite is the real net, exercising renamed routes against a fresh database.

### Tests

- **This is a behaviour-preserving refactor, so the existing suite is the test.**
  It must pass *unchanged in meaning* — update fixture names and imports, never
  weaken an assertion to make it green.
- `git mv` the two e2e specs and both page test files; rename identifiers inside.
- Add nothing new, but verify: `prisma migrate deploy` succeeds from an empty
  database (the e2e `global-setup` does this on every run, so a green e2e suite
  is the proof).
- Full `pnpm test` **and** `pnpm test:e2e` green before merge. This task touches
  1613 hand-edited sites; the suites are the only thing standing between you and
  a silent breakage.

### Acceptance

- No user-visible "חברה"/"Corporation" text in either locale.
- No `orporation` identifier outside migration history and generated code.
- `prisma migrate deploy` succeeds from scratch on an empty database.
- Full e2e suite green.
- Two commits: mechanical rename, then UI wording. Review can skim the first and
  actually read the second.

---

## T2 — `requesterName` (מזמין): new per-project field, printed on the PDF

**Notes:** *"לכל פרוייקט אמור להיות שם מזמין"* (20:04),
*"השלמה אוטומטית לשם המזמין"* (20:06),
*"זאת אומרת שזה אמור להחליף את השדה pdf"* (20:47)

**Decisions:** a **brand-new required field on `Project`**, free text with
autocomplete over previously used values. The `Client` relation is untouched and
remains the grouping on the reports screen. On the PDF the requester **replaces**
the client, and **the client's name then appears nowhere on the document**.

**Size:** M · **Risk:** low

### Why a separate field

`Client` is the account work is grouped and billed under. The **מזמין** is who
commissioned *this particular project* and whose name belongs on that project's
approval document. They frequently differ — one client commissions several
projects through different people — so the PDF has been printing the wrong name.

### Work

1. **Schema** — add `requesterName String` (**required**) to `model Project`.
   No data to backfill. If a dev database has rows, add with `DEFAULT ''` and
   drop the default in the same migration.
2. **Backend DTOs** — add to `create-project.dto.ts` (`@IsString`,
   `@IsNotEmpty`, `@MaxLength`, `@ApiProperty`), `update-project.dto.ts`,
   `project-response.dto.ts`, `project-basic-response.dto.ts`, and the mapper.
3. **PDF — the point of the request.** In `pdf-export.service.ts:103`:
   ```
   - clientName: report.project.client.name,
   + clientName: report.project.requesterName,
   ```
   Rename the template field `clientName` → `requesterName` in
   `ReportApprovalData` while you are there, so it stops lying about what it
   holds. **The Hebrew label at `report-approval.template.ts:44` is already
   `שם המזמין:` and needs no change** — only its data source was wrong.
   After this change the document names the contractor, the requester, the
   project and the subcontractor. **The client is internal-only and is not
   printed anywhere.**
4. **Project form** (`ProjectsPage.tsx`) — required text input labelled
   `מזמין` / `Requester` with autocomplete over previously used values. Cheapest
   correct implementation: a `<datalist>` fed by the distinct `requesterName`
   values already in the `useGetProjectsQuery()` result. **No new endpoint.**
5. **Display** — show the requester on the project card/table.
6. `pnpm --filter frontend codegen`.

### Cleanup to fold into the same PR

The frontend advertises a state the schema forbids. `Project.clientId` is a
**non-nullable FK**, yet the UI offers "no client":

- `langContext.ts:166,390` — `clientOptional: "Client (optional)" / "לקוח (אופציונלי)"`
- `langContext.ts:167,391` — `noClientOption: "— No client —" / "— ללא לקוח —"`
- `ProjectsPage.tsx` — renders `<option value="">{t("noClientOption")}</option>`
  and `project.client?.name ?? "—"`

Drop the empty option, drop "(optional)", mark the select required, tighten the
frontend type so `client` is non-optional. Removes a way to hit a confusing
server error.

### Tests

- **PDF export service** — asserts the template receives the project's
  `requesterName`, and that the client's name is **not** passed. This is the
  crux of the task; without it the one-line change can silently regress.
- **PDF template** — the `שם המזמין:` row renders the requester.
- Project service/mapper — create and update carry `requesterName`; the response
  DTO exposes it.
- Validation — a project without a requester is rejected.
- `ProjectsPage.test.tsx` — the field is required; the datalist offers distinct
  requester names already used on other projects, and still accepts a new value.
- Cleanup regression — the client select no longer renders an empty option.
- e2e `projects.spec.ts` — create a project with a requester; `pdf-export.spec.ts`
  — the exported document shows the requester and **not** the client name.

### Acceptance

- A project cannot be created or saved without a requester name.
- Typing suggests requester names used on other projects, while still accepting
  a new value.
- The PDF's `שם המזמין:` row shows the **project's requester**.
- The client's name appears **nowhere** on the PDF.
- Client grouping on the reports screen and the clients page are unchanged.

---

## T3 — Edit the project description from the export flow

**Note:** *"בייצוא pdf שיהיה אפשר לערוך את התיאור"* (20:55)
**Decision:** *"add a new way to edit the description of the project"*
**Size:** S · **Risk:** low · **Pairs with:** T4 (same dialog)

### Context

`Project.description` is a required `String`, editable today **only** from the
Projects management page. The owner wants to reach it from where the document is
produced, without navigating away.

### Work

In the export dialog on `ReportsPage.tsx` (the `exportReport` `FormModal`), add a
`Textarea` bound to the project's `description`, saved via the existing
`useUpdateProjectMutation` on submit.

Keep it visually distinct from the `approvedFor` field — different things, and
T4 persists one but not the other.

### Tests

- `ReportsPage.test.tsx` — the export dialog prefills the project's current
  description; editing and submitting calls the update mutation with the new
  text; cancelling does **not** persist.
- Assert the description field is distinct from `approvedFor` — they are
  different fields with different persistence rules (T4).

### Acceptance

- Dialog shows the project's current description, pre-populated.
- Editing and exporting persists the change; the Projects page reflects it.
- Cancelling does not persist.

---

## T4 — PDF export remembers the "עבור" text per project

**Note:** *"בייצוא pdf שישמר ה'עבור' מפעמים קודמות"* (20:46)
**Decision:** remember the "for who" field between exports. **Not** chosen: a
full history/audit of past exports.
**Size:** M · **Risk:** low · **Pairs with:** T3

### Context

`ExportProjectReportsPdfDto` requires `approvedFor` (free text, max 500, rendered
as *"חשבון מאושר עבור:"*). `ReportsPage.handleExport` sends it and
`setApprovedFor("")` resets to empty on every open — so the same text is retyped
every month.

### Work

1. **Schema** — add nullable `lastApprovedFor String?` to `Project`. Additive,
   no backfill.
2. **Backend** — on successful export, persist `approvedFor` onto the project.
   Expose on the project response DTO.
3. **Frontend** — prefill the dialog from `project.lastApprovedFor` instead of
   `""`. Fully editable; the prefill is convenience, not a lock.
4. `pnpm --filter frontend codegen`.

### Why `Project` and not `ProjectReport`

The text describes the scope of work ("עבודות שלד + גמר") — a property of the
project, stable across months. That is exactly why retyping it is annoying.

### Tests

- Backend — a successful export persists `approvedFor` onto the project;
  a failed export does **not**.
- Project response DTO exposes `lastApprovedFor`.
- `ReportsPage.test.tsx` — dialog is empty on a project that has never been
  exported, and prefilled from `lastApprovedFor` afterwards; the prefill is
  editable, not locked.
- Two projects keep independent values.
- e2e `pdf-export.spec.ts` — export a project twice; the second dialog opens
  prefilled with the first export's text.

### Acceptance

- First export of a project: empty, as today.
- Every subsequent export: prefilled with the last used text.
- Editing and exporting updates what is remembered.
- Two projects keep independent values.

---

## T5 — Supplier payments page: grouped list, batch entry, paid check

> Uses post-T1 naming. Read `Supplier` as `Corporation` if T1 has not landed.

**Notes:** *"תשלומי חברה לכולם ביחד"* (20:27),
*"שיהיה אפשר לחלק תשלומי חברה לכמה חשבוניות"* (20:33),
*"בין כל חברה שיהיה קו מודגש"* (20:28),
*"להוסיף תיאור לתשלומי חברה"* (20:39),
*"לסמן האם שולם או לא"* (21:10)

**Decision, verbatim:**
> "the list should be sorted by corporations where each different corporation
> should have some sort of delimiter. We want to be able to add right from this
> page corporation payments but how it works is that we usually get paper work of
> all of the specific corporation x payments and we want to document all of the
> payments of x in one go. And in this page we want to have a way to check that
> payment is done"

**Size:** L · **Risk:** medium

### The workflow being served

The contractor receives a stack of paperwork from supplier X listing everything X
is owed this month across several projects. They sit down **once per supplier**
and type it all in. So the page must:

1. Show existing payments **grouped by supplier**, so they can see what is
   already recorded for X.
2. Let them enter **all of X's payments in one submission**.
3. Let them tick off payments once actually paid.

This is also what note 20:33 means — one batch covers several invoice lines.
**Not** a nested invoice table under a single payment row.

### Current state (verified)

- `CorporationPaymentsPage.tsx` is **read-only apart from VAT**. It flattens
  every group via `groups.flatMap(...)`, so the supplier name repeats per row and
  nothing is grouped.
- `CorporationPayment.description` **already exists** in the schema — note 20:39
  is **UI-only, no migration**. It is simply never surfaced.
- `POST /corporations/payments` exists but creates **one** payment.
- `corporation-payments.service.create` **auto-resolves VAT** via
  `vatRatesService.resolveForMonth(date)` when `isFuture` is false and no explicit
  `vatPercentage` is given. **The batch path must preserve this per row.**

### Work

**1. Schema** — add `isPaid Boolean @default(false)` to `SupplierPayment`.

**2. Batch create endpoint** — e.g. `POST /suppliers/:supplierId/payments/batch`,
body an array of `{ projectReportId, amount, date, description? }`.

Create **all-or-nothing inside a `$transaction`**. Precedent to copy:
`project-reports.service.ts:119` already wraps nested `createMany` for these
payments in exactly this shape. Atomicity matters — a half-saved stack with no
indication of which half is worse than a clean failure.

Preserve per-row VAT resolution.

**3. Toggle-paid endpoints** — one for a single payment, one for "all of this
supplier's payments this month". Mirror the existing VAT patch endpoint's shape.
Include `isPaid` in all response DTOs.

**4. Grouped list** — stop flattening. One section per supplier:
- heading with the supplier name
- its payment rows (project, amount, VAT, total, description, paid checkbox)
- a **subtotal** reading e.g. "₪12,000 of ₪18,000 paid"
- a **bold divider between suppliers** — heavier than the existing
  `border-border` hairline

**5. Batch entry UI** — "+ document payments" opens a modal **scoped to one
supplier**:
- step one: pick the supplier
- then an editable multi-row table — project, amount, date, description — with
  add-row / remove-row, mirroring the `corpPayments` draft-row pattern already in
  `ReportsPage.tsx`
- a **running total** so it can be reconciled against the paperwork before saving
- one submit → one batch request

**Project picker:** offer **only projects that already have a report for the
selected month.** A payment's `projectReportId` is a required FK, so a project
without a report for that month cannot receive one. (Decision: do not auto-create
reports, and do not show unusable options.)

**6. Paid check** — checkbox per row, plus **"mark all paid" on each supplier's
group header**, since a stack usually settles as one transfer. Style paid rows
distinctly.

**7. Description** — surface the existing column in the table and batch form.

**8.** `pnpm --filter frontend codegen`.

### Known limitation, by decision

If supplier X's paperwork names a project with no report for that month, that row
**cannot be entered** until a report exists. The user must create the report
first. Accepted deliberately — the alternative was auto-creating empty reports
that would then appear in the reports screen and in totals.

Consider making this legible rather than mysterious: an inline hint near the
project picker saying only projects with a report for this month are listed.

### Tests

- **Batch create is atomic** — a batch where one row is invalid writes
  **nothing**. Assert the table is empty afterwards. This is the single most
  important test in the task.
- **VAT resolution is preserved per row** — a batch row with no explicit
  `vatPercentage` and `isFuture: false` resolves the month's rate, exactly as
  the single-create path does today.
- Toggle paid: single row, and mark-all-in-group setting every row of that
  supplier and no others.
- Mapper — grouping shape, and the per-supplier subtotal splitting paid vs total.
- `CorporationPaymentsPage.test.tsx` — renders grouped with a divider between
  suppliers; the batch modal's running total updates as rows change; the project
  picker lists only projects having a report for the selected month.
- e2e `corporation-payments.spec.ts` (renamed by T1) — document a stack of one
  supplier's payments in one submission, then mark the group paid.

### Acceptance

- Payments grouped per supplier, bold separator, subtotal showing paid vs total.
- A full stack of one supplier's payments saves in a single submission; a
  failure part-way saves nothing.
- VAT resolved per row exactly as the single-create path does today.
- Each payment tickable paid/unpaid; group header marks all at once.
- Description visible and editable.
- Grand total still correct; RTL intact.

---

## T6 — Per-report simulator override + client-wide simulated PDF export

**Notes:** *"בסימולטור פר פרוייקט שיהיה אפשר לדרוס את הערך של הרווח"* (20:24),
*"אני רוצה שאני אוכל להדפיס את כל המשבצות עם הסימולטור"* (20:36)

**Decision, verbatim:**
> "I want to be able to control each project report profit simulator and to be
> able to export to pdf the data as if so the simulator was the real profit
> margins, this is totally new export that includes all project reports of the
> client"

Document shape: **a summary page first, then the full per-project detail pages.**
`ProfitSimulatorPage.tsx`: **harvest its logic, then delete it.**

**Size:** L · **Risk:** medium-high — the largest remaining risk in the backlog

### (a) Per-report override

The inline simulator on `ReportsPage` (the `profitSimulator` block in the client
view) has a **single** `simMargin` input applied uniformly to every report. The
owner wants one control per project report.

**`ProfitSimulatorPage.tsx` already implements this** — baseline slider plus a
per-project override `Map` with saved-vs-simulated deltas. **It is dead code:**
the router maps `path: "simulator"` to `<Navigate to="/reports" replace />` and
nothing imports it (verified by grep).

**Harvest that override logic into the inline simulator on `ReportsPage`, then
delete `ProfitSimulatorPage.tsx` and its test.** One simulator, in the place it
is actually used. Do not write a third implementation.

### (b) New PDF export

A genuinely new document, distinct from the per-report account approval:

| | existing export | new export |
|---|---|---|
| scope | one `ProjectReport` | **all** of a client's reports for the month |
| margins | stored `profitMargin` | **the simulated overrides** |
| template | `report-approval.template.ts` | new template |
| trigger | per-tile button | client view, "export with simulator" |

**Structure:** a **summary page** — one row per project showing income, simulated
margin, profit, supplier deductions and subcontractor remainder, with client
totals at the bottom — **followed by the per-project detail pages**, each in the
familiar account-approval layout but rendered at the simulated margin.

Simulated margins are **transient UI state and are never persisted**. The
override map goes in the request body and is applied server-side at render time.

### Work

1. Per-report margin controls in the `ReportsPage` inline simulator, reusing the
   harvested logic. Delete the orphan page and its test.
2. New DTO: client id, month, and a `projectId → margin` override map.
3. New template beside `report-approval.template.ts`, following its conventions:
   bilingual `LABELS`, `escapeHtml` on every interpolated value, `formatCurrency`,
   RTL `dir`, company logo/signature from `CompanySettings`.
4. New service method + controller route reusing the existing puppeteer pipeline.
5. Frontend "export with simulator" button in the client view, posting the current
   overrides and downloading the blob — mirror `handleExport`'s
   `URL.createObjectURL` pattern.

### Watch out

- Reuse the existing errors: `CompanySettingsIncompleteError`,
  `VatRateNotConfiguredError`, `NoReportsForExportError`. The frontend already
  surfaces these via the global RTK Query error listener.
- **Validate the override map server-side** — margins 0–100. Never trust client
  input into a financial document.
- If T7 has landed, decide whether the initiator appears on this document too.

### Tests

- **Exporting with overrides does not mutate stored `profitMargin`.** Export
  with overrides, then re-read every report and assert the saved margins are
  unchanged. Without this the task can silently corrupt real data.
- Override-map validation — rejects margins below 0 or above 100, and a
  `projectId` that is not the client's.
- Service — the document covers **every** report of that client for the month,
  and figures are computed at the simulated margin, not the stored one.
- Template — renders the summary page and the per-project detail pages, in he
  and en.
- Reuses the existing errors (`CompanySettingsIncompleteError`,
  `VatRateNotConfiguredError`, `NoReportsForExportError`).
- `ReportsPage.test.tsx` — per-report overrides are independent of each other and
  of the baseline; reset restores saved values.
- **Delete `ProfitSimulatorPage.test.tsx` along with the page.** Do not leave a
  test for deleted code.
- e2e — set overrides, export, then assert the reports screen still shows the
  original saved margins.

### Acceptance

- Each project report has its own margin control; overrides independent.
- Export produces summary page + detail pages for every report of the client in
  the month, at simulated figures.
- Stored `profitMargin` values are **not** mutated by simulating or exporting.
- Renders correctly in he and en.
- `ProfitSimulatorPage.tsx` is gone; no dead simulator remains.

---

## T7 — `Initiator` (יזם): entity, optional link, documentation-only payments

**Notes:** *"יזם אופציונלי בפרוייקט"* (20:06),
*"להוסיף יזמים בניהול... אופציה לתעד תשלומים ליזם"* (21:03),
*"חשבון שאושר על ידי מזמין וחשבון שאושר על ידי יזם"* (21:04)

**Decision, verbatim:**
> "if it exists we just want to be able to add to the project report just like
> corporation payment a payment to him, this is needed just so that it would be
> documented in the pdf, it does not touch any calculation just another field
> that should be documented in the project reports and in the pdf. Again only if
> it exists at all"

Code name **`Initiator`** — not `Developer`, which collides with software
vocabulary. **Managed entity with its own CRUD page. No second PDF.**

**Size:** M · **Risk:** LOW — touches no calculation

### The rule that defines this task

**Nothing here changes any number that is already calculated.** The formula stays
exactly as it is:

```
profit     = totalIncome × (profitMargin / 100)
corpTotal  = Σ supplierPayments.amount
subPayment = totalIncome − profit − corpTotal        ← unchanged
```

An initiator payment is recorded and displayed. It is **not** subtracted from
anything, **not** added to any total, and **not** reflected in what the
subcontractor is owed. If `initiatorTotal` appears inside an arithmetic
expression, that is a bug.

### Scope

1. **`Initiator` model** — `id`, `name` (unique), mirroring `Supplier`, plus a
   `payments` back-relation.
2. **Management page** — CRUD mirroring `SuppliersPage`, including the search box
   from `183147c`. Add to `Sidebar.tsx` and `router.tsx`.
3. **Optional link on `Project`** — `initiatorId String?`, **nullable** (unlike
   `clientId`). Selectable in the project create/edit form (note 20:07: "all of
   this at project creation").
4. **`InitiatorPayment`** — `projectReportId`, `initiatorId`,
   `amount Decimal(12,2)`, `date DateTime?`, `description String?`, both relations
   `onDelete: Cascade`. Add `initiatorPayments` to `ProjectReport`.
   - **Skip `isFuture` and `vatPercentage`.** They exist on `SupplierPayment` to
     drive VAT resolution and the effective-total column — machinery a
     documentation-only row does not need. Do not copy fields just because the
     sibling model has them.
5. **Report form + tile — both screens.** Payments attach to a **report**
   (`projectReportId`), so every report of a project that has an initiator can
   document payments to them, multiple per report.
   - `ReportsPage.tsx` — the add-report modal, when the selected project has an
     initiator: initiator payment rows using the `corpPayments` draft-row pattern.
   - `ProjectReportsPage.tsx` — the per-project drill-down at
     `/reports/projects/:id`, where reports are viewed and edited. **Do not skip
     this one** — it is the other place a report is maintained.
   - The tile lists initiator rows as informational, styled so they clearly do
     **not** participate in the subtotal above the subcontractor line.
6. **PDF** — add the initiator's name and payment rows to
   `report-approval.template.ts` alongside `supplierRows`. Single approval
   addressed to the מזמין. Labels in **both** `LABELS.he` and `LABELS.en`.

### Gating — "only if it exists at all"

- **No initiator on the project** → no section in either form, no rows on the
  tile, **no initiator block on the PDF at all** — not an empty heading, not a
  zero row, absent.
- **Initiator but no payments this month** → **print the initiator's name
  anyway.** Knowing who initiated the project is itself the documentation. Only
  the payment rows are conditional on there being payments.

### Worth doing while you are here

The subcontractor-remainder formula is **copy-pasted** across `ReportsPage.tsx`
(`totalSubcontractorPayments`, `ProjectSheet`, the inline simulator) and
`SubcontractorPaymentsPage.tsx`. Extracting it into one shared helper is good on
its own merits, and makes it structurally obvious that initiator payments are not
part of it.

### Tests

- **🔴 The test that defines this task: record an initiator payment and assert
  the subcontractor's remainder does not move.** Also assert
  `totalSubcontractorPayments`, the simulator output, and the existing PDF totals
  are byte-identical before and after. If `initiatorTotal` ever leaks into an
  arithmetic expression, this is what catches it.
- Initiator service + controller specs, mirroring the supplier ones.
- `InitiatorPayment` create/update/delete, scoped to a report.
- **PDF gating**, three cases: no initiator → block entirely absent (not an empty
  heading, not a zero row); initiator with no payments → **name printed**, no
  rows; initiator with payments → name and rows.
- Both locales.
- **Both edit surfaces** — `ReportsPage.test.tsx` (add-report modal) and
  `ProjectReportsPage.test.tsx` (the per-project drill-down). The second is the
  one most likely to be forgotten.
- New e2e spec `initiators.spec.ts` — CRUD, attach to a project, record a payment
  on a report, confirm it appears on the exported PDF.

### Acceptance

- Initiators CRUD page with search, reachable from the sidebar.
- A project can be created and edited with or without an initiator.
- On **any** report of a project with an initiator — from either screen — payment
  rows can be added, edited and deleted.
- **Every existing financial figure is identical before and after**: subcontractor
  remainder, `totalSubcontractorPayments`, the simulator, the subcontractor
  payments page, existing PDF totals. **Assert this with a test** that records an
  initiator payment and confirms the remainder does not move.
- PDF shows the initiator name whenever the project has one; payment rows only
  when they exist; nothing at all when the project has no initiator.
- Migration additive; existing projects and reports keep working.

---

## T8 — `location` on Project + richer tile header

**Note:** *"בדף אחרי שבחרתי את הלקוח שיהיה רשום בכותרת של כל משבצת שם פרוייקט,
מיקום, ואז בקטן את התיאור"* (20:56)

**Decision:** **new required field** on `Project`.
**Size:** S · **Risk:** low · **Natural companion to T2** (same form, same migration window)

### Work

1. **Schema** — add `location String` (**required**) to `model Project`. Same
   migration note as T2: no data to backfill; use `DEFAULT ''` then drop it if a
   dev database has rows.
2. **DTOs** — create/update/response + mapper, as T2.
3. **Project form** — required text input, `מיקום` / `Location`.
4. **Tile header** (`ProjectSheet` in `ReportsPage.tsx`) — currently renders only
   `report.project.name` as a button. Restructure to:
   - **project name** — primary, keeps the existing navigate-on-click behaviour
   - **location** — beside or beneath the name, secondary weight
   - **description** — beneath, in smaller muted type

   Keep the `exportPdf` button where it is. Watch the RTL layout and make sure a
   long description does not break the card's height alignment in the grid.

### Open point

Should `location` also appear on the PDF? Not requested. Left out. Say so if it
should be added — it is one line in the template plus two labels.

### Tests

- Validation — a project without a location is rejected.
- Project DTOs/mapper carry `location`.
- `ReportsPage.test.tsx` — the tile header renders project name, location, then
  description; the project name is still clickable through to its reports.
- A long description does not break the card layout (assert structure, not pixels).
- Both locales; RTL ordering correct.
- e2e `projects.spec.ts` — create a project with a location and see it on the tile.

### Acceptance

- A project cannot be created or saved without a location.
- Each tile header reads: project name, location, then description in small type.
- Project name remains clickable through to the project's reports.
- Both locales, RTL correct, grid alignment preserved.

---

## T9 — Choosable payment date on subcontractor payments

**Note:** *"בתשלומי קבלני משנה להוסיף תאריך, אם יש כמה משנה אז ליד כל תאריך שיהיה
את הסכום"* (20:41)

**Decision, verbatim:**
> "Each subcontractor payment should let you choose the date that it was maken,
> each partial or full payment should have a date that we can choose and we want
> to be able to see the date"

**Size:** M · **Risk:** low · **Ship together with T10** (same screen)

### Current state (verified)

`SubcontractorPayment` has `serviceDate DateTime @db.Date` — but
`SubcontractorPaymentsPage.tsx` hardcodes it on every write:

- `handleSetPaid` → `serviceDate: month + "-01"`
- the partial-payment path → `serviceDate: month + "-01"`

So `serviceDate` records **which month is being settled**, never when money
actually moved. There is no record of the real payment date anywhere.

### Work

1. **Schema** — add `paymentDate DateTime? @db.Date` to `SubcontractorPayment`.
   Keep `serviceDate` meaning "which month this settles" — do not overload it.
2. **DTOs** — accept `paymentDate` on create; expose on responses.
3. **UI** — the full-payment and partial-payment flows both take a date input,
   defaulting to today but editable. Each recorded payment then displays as its
   own line: **date on one side, amount on the other**, exactly as the note asks.
   Multiple partial payments in a month each show their own date and amount.
4. `pnpm --filter frontend codegen`.

### Tests

- `paymentDate` persists and is returned; a payment recorded without one is
  handled per whatever default the form sends.
- **`serviceDate` semantics are unchanged** — still the settled month, still
  `<month>-01`. Assert this explicitly so the two dates never get conflated.
- A month with three partial payments returns three rows, each with its own date
  and amount.
- `SubcontractorPaymentsPage.test.tsx` — full and partial flows both offer an
  editable date defaulting to today; each payment renders its date and amount.
- Owed/paid totals are unchanged by adding the field.
- e2e `subcontractor-payments.spec.ts` — record two partial payments on different
  dates and see both listed.

### Acceptance

- Recording any payment — full or partial — lets the user pick the date.
- Each payment displays with its own date and amount.
- A month with three partial payments shows three dated lines.
- `serviceDate` semantics unchanged; existing owed/paid figures unchanged.

---

## T10 — Balance (יתרה) row on subcontractor payments

**Note:** *"בתשלומי קבלן ליד השורות של חייב ושולם להוסיף יתרה"* (20:43)
**Size:** XS · **Risk:** none · **Ship together with T9**

### Current state

The subcontractor card shows two figures — `{t("owed")}: …` and `{t("paid")}: …`.
A per-project `remaining` is already computed (`const remaining = pb.owed - paid`)
but the card-level balance is never displayed.

### Work

Add a third row beside owed and paid: **יתרה / Balance** = `totalOwed − totalPaid`.
Add both locale keys. Style it to stand out — it is the number the user actually
acts on. Consider colouring it like the existing status badges: settled when
zero, outstanding when positive.

### Tests

- Balance equals owed minus paid, including the zero case and a fully-paid card.
- It updates immediately when a payment is recorded or removed.
- Both locales.
- Fold into the T9 e2e run rather than adding a separate spec — same screen.

### Acceptance

- Card shows owed, paid and balance.
- Balance equals owed minus paid and updates immediately when a payment is
  recorded or removed.
- Both locales.

---

## T11 — Project opening balance ("how much have I already received?")

**Note:** *"בהוספת פרוייקט בגלל שנכנסים באמצע אני רוצה שזה ישאל כמה כבר קיבלתי"*
(20:44)

**Decision:** auto-create a **back-dated project report** for the amount, and
**ask for the subcontractor and profit margin too**.
**Size:** M · **Risk:** medium — creates real financial records

### Why the extra fields are required

`ProjectReport` requires **both** `subcontractorId` and `profitMargin`, and has
`@@unique([projectId, date])`. A synthetic report cannot be created without real
values for those. The owner chose to ask for them rather than make the columns
nullable — which would have forced null handling through every calculation.

### Work

1. **Project create form** — an optional "already received" section. When the
   user fills it in, it asks for:
   - amount already received
   - the month it covers (drives the report's `date`, set to the 1st)
   - subcontractor
   - profit margin
2. **Creation** — create the project, then create a `ProjectReport` for that
   month with one income entry for the amount. **Do this in a single
   `$transaction`** so a failure cannot leave a project with a half-made report.
   Consider a dedicated endpoint, or extend project creation with an optional
   nested payload.
3. **Validation** — reject a month that already has a report for that project
   (`@@unique([projectId, date])` would throw a raw Prisma error otherwise). The
   `prisma/errors` helpers already map unique-constraint failures; reuse them for
   a clear message.
4. **Tag the income entry** so the synthetic origin is visible — e.g. a tag
   reading "opening balance" / "יתרת פתיחה". Costs nothing and explains the row
   to whoever reads it in six months.

### Consequences to be aware of

This report is a **real** report. It appears on the reports screen for that month,
in monthly income, in supplier and subcontractor payment views, and in totals.
That is what "auto-create a back-dated report" means, and it is the right
behaviour — but it is not invisible bookkeeping.

### Tests

- **Atomicity** — a failure creating the report leaves **no project** behind.
  Assert both tables are empty afterwards.
- Filling nothing in creates a project and **no** report — the section is optional.
- Filling it in creates exactly one report with one income entry for the amount.
- **A duplicate month for the same project fails with a clear mapped error**, not
  a raw Prisma unique-constraint throw. The `prisma/errors` helpers already exist
  for this.
- The created report behaves identically to a hand-made one — assert it appears
  in monthly income and in the reports list for that month.
- The income entry carries the opening-balance tag.
- e2e `projects.spec.ts` — create a project with an opening balance, then find
  that month's report on the reports screen.

### Acceptance

- Project creation works unchanged when the section is left empty.
- Filling it in creates exactly one report with one income entry for the amount.
- A failure at any step creates neither project nor report.
- Duplicate month for the same project fails with a clear message, not a raw
  Prisma error.
- The created report behaves identically to a hand-made one everywhere.

---

## T12 — Add/edit the income entry tag from the report screens

**Note:** *"שיהיה אופציה לערוך / להוסיף את התיאור בהוספת תשלום מכל המסכים"* (21:07)

**Clarification, verbatim:**
> "Currently we cannot edit the tag or add tag from some screens, this is what i
> ment"

**Decision:** tag editing needed on **all three** — the project report detail
page, inline on the project tiles, and an edit-report modal.
**Size:** M · **Risk:** low-medium — see the warning below

### Current state (verified)

`ProjectReportIncome.tag` can be set **only at report creation**, in the
add-report modal on `ReportsPage.tsx` (`IncomeEntryDraft.tag`, the input at
`ReportsPage.tsx:541`). It is displayed at `ReportsPage.tsx:718`
(`{entry.tag ?? t("income")}`) but there is **no way to change it afterwards from
anywhere in the app**.

The `income` module exposes only a `@Get()`. There is no per-entry write endpoint.

### ⚠️ Do not route tag edits through the report update endpoint

`project-reports.service.ts` update does `deleteMany: {}` followed by `createMany`
for `incomeEntries`. **Every income row is destroyed and recreated with new ids on
any report update.** Editing one tag that way churns ids, breaks anything holding
a reference, and rewrites rows that were not touched.

**Add a dedicated endpoint** — e.g. `PATCH /projects/reports/incomes/:id` taking
`{ tag }` — that updates the single row in place. Small, and it avoids the
destroy-and-recreate entirely.

(That delete-and-recreate is worth a separate look on its own merits. Out of
scope here; do not fix it inside this task.)

### Work

1. **Backend** — new module/endpoint patching one income entry's tag. DTO with
   `@IsOptional() @IsString() @MaxLength(...)`, allowing null to clear.
2. **Project report detail page** (`ProjectReportsPage.tsx`) — inline edit on each
   income row.
3. **Project tiles** (`ReportsPage.tsx`, `ProjectSheet`) — inline edit on the
   income rows without opening anything. Match the light-touch pattern of the
   existing `VatInput` on the payments page: edit in place, small confirm affordance.
4. **Edit-report modal** — reachable from the tile, mirroring the add-report modal
   so tags can be edited alongside everything else. If a general edit-report modal
   does not exist yet, this task needs one, or the entry point scoped to tags.
5. `pnpm --filter frontend codegen`.

### Tests

- **🔴 Patching a tag does not recreate income rows.** Capture the entry ids
  before and after, and assert they are unchanged. This is the exact trap the
  task exists to avoid — routing through the report update endpoint would churn
  every id and this is what catches it.
- Tag can be set, changed, and cleared to null.
- Amounts, dates, and every derived figure are untouched by a tag edit.
- Validation — over-long tags rejected.
- All three surfaces: `ProjectReportsPage.test.tsx`, the inline edit on the tiles
  in `ReportsPage.test.tsx`, and the edit-report modal.
- e2e `project-reports.spec.ts` — set a tag at creation, change it afterwards,
  and confirm the amount is unaffected.

### Acceptance

- A tag can be added, changed and cleared from all three places.
- Editing a tag does **not** recreate income rows or change their ids.
- Amounts, dates and every derived figure are untouched by a tag edit.
- Both locales; RTL correct.

---

## T13 — Total income per client on the reports screen

**Note:** *"להוסיף סך הכל הכנסות פר לקוח כמו שיש לי סך הכל תשלומי קבלן"* (20:22)

**Decision, verbatim:**
> "Besides the subcontractor payments total we should have another income total
> for sleected month value"

**Size:** XS · **Risk:** none

### Current state

The client detail view header on `ReportsPage.tsx` shows exactly one figure:

```
{t("totalSubcontractorPayments")}: ₪{totalSubcontractorPayments.toLocaleString("he-IL")}
```

`totalSubcontractorPayments` is a `useMemo` over `selectedClientReports`.

### Work

Add a sibling figure beside it — **total income for the selected client and
month** — computed the same way:

```
selectedClientReports.reduce((sum, r) => sum + r.totalIncome, 0)
```

Add `totalIncome` locale keys if not already present. Keep both figures on one
line, wrapping sensibly at narrow widths (the header already uses `flex-wrap`).

Scope is the **selected month only**, matching the existing total beside it.

### Tests

- The income total equals the sum of `totalIncome` across that client's reports
  for the selected month — and **only** that month.
- It is zero, not absent or NaN, for a client with no income that month.
- `ReportsPage.test.tsx` — both figures render side by side and the header still
  wraps cleanly at narrow widths.
- Both locales.

### Acceptance

- Client view shows total income and total subcontractor payments side by side.
- Income total equals the sum of `totalIncome` across that client's reports for
  the selected month.
- Both locales; header still wraps cleanly when narrow.

---

## T14 — Transfer a project between clients, effective from a month

**Note:** the **voice message at 21:13** — a project belongs to one client, and
from month X it transfers to another client.

**Decisions:**
- **History is frozen.** Months before the transfer stay with the old client
  forever. Last year's numbers never change.
- **One estimate.** `estimatedAmount` stays a single figure for the whole
  project and payment progress keeps counting across both clients. The transfer
  changes who is billed each month, nothing else.
- **Any number of transfers.** A project can change hands repeatedly.
- **The requester is unaffected.** `requesterName` (T2) stays whatever it is and
  is edited separately.

**Size:** L · **Risk:** medium-high — restructures how the client is resolved
**Land this early — right after T1.** T6, T11 and T13 all consume client
resolution; doing it after them means reworking them.

### Why a single "transferred from" field is not enough

Frozen history plus repeated transfers means the app must be able to answer
*"who owned this project in month M?"* for any M. That is an effective-dated
relationship, not a scalar.

### Current state (verified)

The client is resolved by **traversal** — `report.project.client` — in four
backend services (`project-reports`, `income`, `subcontractor-payments`,
`projects`) and five places in the frontend (`ReportsPage.tsx:126,143,298`,
`SubcontractorPaymentsPage.tsx:80,81`, `ProjectsPage.tsx:152,197,339`).

**So changing `Project.clientId` today retroactively moves all history** to the
new client. That is precisely what this feature must not do.

### What makes this much cheaper than it looks

**Every client-grouping read path is already scoped to a single month** —
`income.getMonthlyIncome(month)`, `project-reports.findAll({ month })`,
`subcontractor-payments` with `MonthQueryDto`. So resolution never needs a
correlated per-row subquery: fetch the assignments once per request, build a
`projectId to clientId` map for that month, and resolve in memory.

### Model

```
model ProjectClientAssignment {
  id            String   @id @default(cuid())
  projectId     String
  clientId      String
  effectiveFrom DateTime @db.Date

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  client  Client  @relation(fields: [clientId], references: [id])

  @@unique([projectId, effectiveFrom])
  @@map("project_client_assignments")
}
```

The client for a report is the assignment with the **greatest `effectiveFrom`
that is less than or equal to the report's date**.

**Keep `Project.clientId` as a cache of the current client** — the assignment
with the latest `effectiveFrom`. This keeps the projects list, the `clientId`
filter in `projects-query.dto.ts`, and project creation working unchanged. It
must have exactly **one writer** (the transfer/assignment service) and must
**never be read to answer a historical question**. Document it as derived.

*(The alternative — drop `clientId` and derive everything — is a purer single
source of truth but churns the whole projects service. The cache is the
pragmatic call here; revisit if drift ever shows up.)*

### 🚨 Client deletion becomes a data-loss bug

`clients.service.ts` deletes a client by hard-cascading through **projects,
reports, income entries, supplier payments and subcontractor payments** in one
transaction.

Once projects can transfer, **deleting client A would destroy a project that now
belongs to client B**, along with all of B's history on it. This is not
hypothetical — it follows directly from the existing delete implementation.

**This must be handled in this task.** Options, in order of preference:

1. **Refuse to delete a client that holds any assignment**, past or present, with
   a clear message naming the projects involved. Safest, and honest about what
   the data means.
2. Delete only projects whose **entire** assignment history is that client, and
   refuse if any project has assignments elsewhere.

Do not leave the current cascade in place.

### Work

1. **Schema + migration** — the model above, plus the `assignments` back-relations
   on `Project` and `Client`.
2. **Backfill** — one assignment per existing project: its current `clientId`,
   with `effectiveFrom` at or before that project's earliest report date. Use a
   safely early date if a project has no reports. Every project must end up with
   at least one assignment, or resolution returns nothing and reports vanish from
   the UI.
3. **Resolution helper** — one shared function, e.g.
   `resolveClientsForMonth(month)` returning `projectId to client`. Every
   month-scoped service uses it. **One implementation** — do not inline the
   resolution in four places.
4. **Read paths** — update `project-reports`, `income`, `subcontractor-payments`
   to attach the resolved client rather than traversing `project.client`. The
   response DTO shape can stay identical, so the frontend traversals mostly keep
   working; verify each one.
5. **Transfer endpoint** — `POST /projects/:id/transfer` taking
   `{ clientId, effectiveFrom }`. Creates an assignment and refreshes the cached
   `Project.clientId`, in a transaction. Validate: the client exists, the month is
   not already an assignment boundary for that project, and — decide — whether a
   transfer may be back-dated before the project's earliest report.
6. **Correcting a transfer** — the month will sometimes be entered wrong. Provide
   edit and delete for an assignment, refusing to remove the earliest one (every
   project must always have a first assignment).
7. **UI** — a "transfer to another client" action on the project (Projects page,
   and sensibly also the project reports page). Dialog: new client + effective
   month. Show the project's transfer history somewhere — a small timeline of
   "client A until Feb 2026, client B from Mar 2026" makes the state legible and
   makes a wrong month obvious.
8. `pnpm --filter frontend codegen`.

### Interactions with other tasks

- **T13** (income total per client) — must total by **resolved** client, not
  `project.client`.
- **T6** (client-wide simulated PDF) — "all of a client's reports for the month"
  means resolved client for that month.
- **T11** (opening-balance report) — the synthetic report lands under whichever
  client owned the project in that month.
- **T5** (supplier payments) — unaffected unless it groups by client anywhere.
- **T2** (`requesterName`) — explicitly unaffected, by decision.

### Tests

- **🔴 Frozen history, the core case.** A project with reports either side of a
  transfer: a month **before** resolves to the old client, a month **on or after**
  to the new one. Assert this in every grouping path — reports list, monthly
  income, and subcontractor payments — not just one.
- **🔴 Client deletion no longer destroys a transferred-away project.** Transfer a
  project from A to B, delete A, and assert the project and all its reports still
  exist. This is a regression test for a real data-loss bug the feature would
  otherwise introduce.
- **Multiple transfers chain correctly** — A → B → C, with three months resolving
  to three different clients.
- **Backfill** — after the migration, every pre-existing project resolves to its
  original client. A project resolving to nothing would vanish from the UI, so
  test the empty-assignment case explicitly.
- Transferring changes **no** financial figure — only grouping. `estimatedAmount`
  and payment progress still span both clients.
- Correcting a wrongly-entered transfer month re-resolves affected months, and
  removing the earliest assignment is refused.
- The cached `Project.clientId` matches the latest assignment after every
  transfer, edit and deletion.
- New e2e spec `project-transfer.spec.ts` — transfer a project, then check the
  reports screen for a month either side of the boundary.

### Acceptance

- A project can be transferred to another client from a chosen month, repeatedly.
- A month before a transfer shows the report under the **old** client, everywhere:
  reports screen, monthly income, subcontractor payments, and any PDF.
- A month on or after the transfer shows it under the **new** client.
- Transferring changes **no** financial figure — only which client each month is
  grouped under. `estimatedAmount` and payment progress span both clients.
- A transfer month entered wrongly can be corrected without data loss.
- Deleting a client can no longer destroy a project that has moved away from it.
- Every existing project still resolves to its current client after the backfill.

---

## Suggested order

| # | task | size | why here |
|---|---|---|---|
| 1 | **T1** Corporation→Supplier + labels | L | **gates T5 and T7** — merge first |
| 2 | **T14** project transfer between clients | L | foundational — T6, T11, T13 all consume client resolution |
| 3 | **T2** requesterName + PDF | M | schema + one-line PDF swap |
| 4 | **T8** location + tile header | S | same form and migration window as T2 |
| 5 | **T13** income total | XS | one-line win, no dependencies |
| 6 | **T10** balance row | XS | one-line win, ship with T9 |
| 7 | **T9** subcontractor payment dates | M | same screen as T10 |
| 8 | **T3** edit project description | S | shares a dialog with T4 |
| 9 | **T4** remember עבור | M | pairs with T3 |
| 10 | **T12** tag editing | M | needs the new per-entry endpoint |
| 11 | **T11** project opening balance | M | creates real reports — do after the basics are stable |
| 12 | **T5** supplier payments page | L | needs T1 |
| 13 | **T7** Initiator | M | needs T1's naming |
| 14 | **T6** simulator + new export | L | largest risk; do last, after T7 settles what the PDFs show |

**Batching suggestion.** T2 + T8 are two required columns on `Project` touching
the same form — one migration, one PR. T9 + T10 are the same screen — one PR.
T13 alone is a few lines and can ride with anything.

T1 is the only hard gate. T14 is a soft one: it is not blocked by anything, but
T6, T11 and T13 are cleaner built on top of it than retrofitted to it.

---

## Still open

Small, and none of it blocks starting:

1. **T8** — should `location` also print on the PDF? Not requested, left out.
2. **T6** — if T7 lands first, does the new client-wide export also show the
   initiator? T7 settles the per-report PDF; this document is separate.
3. **T12** — whether a general edit-report modal already needs building, or the
   entry point is scoped to tags only. Depends on how far the third surface goes.
4. **The delete-and-recreate on report update** (`project-reports.service.ts`) is
   a real latent issue flagged inside T12, deliberately left out of scope. Worth
   its own ticket.
5. **Migration history** has two `_init` migrations (`20260502154024_init` and
   `20260515191724_init`) with an unrelated one between them. Harmless, but odd —
   and while there is no real data, squashing is cheap. Keep it out of the T1 PR:
   conflating it would turn a skimmable mechanical diff into one needing real
   review.

### Notes coverage

The voice message at 21:13 is now captured as **T14**. Every note raised across
the review sessions maps to a task above.

If anything else in the original photos was never discussed, it is not in scope
of any task here — a final pass against the originals is still worth doing before
treating this as closed.
