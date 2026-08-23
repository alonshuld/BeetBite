# E2E test plan — next round

A plan for extending BeetBite's end-to-end coverage, with the PDF project-report
export as the headline addition.

Written against `dev` (`212eb51`). **Parts A0–A2 and B1–B4, B6 are implemented**;
see *Implementation notes* at the end for the two places reality diverged from
the plan. Section headings carry a status marker — ✅ done, ⬜ not started.

---

## 1. Where coverage stands today

### Playwright suite — `apps/e2e/tests/` (60 tests, 9 files)

| File | Tests | Route(s) under test |
| --- | --- | --- |
| `auth.spec.ts` | 7 | `/login`, redirect guards |
| `clients.spec.ts` | 5 | `/clients` |
| `corporations.spec.ts` | 4 | `/corporations` |
| `corporation-payments.spec.ts` | 2 | `/corporation-payments` |
| `income.spec.ts` | 3 | `/income` |
| `project-reports.spec.ts` | 23 | `/reports/projects/:id` |
| `projects.spec.ts` | 4 | `/projects` |
| `subcontractor-payments.spec.ts` | 7 | `/subcontractor-payments` |
| `subcontractors.spec.ts` | 5 | `/subcontractors` |

### Backend integration suite — `apps/backend/test/`

`project-reports.e2e-spec.ts` and `subcontractor-payments.e2e-spec.ts`. Both
drive real services against a real Postgres testcontainer. No other module has
an integration spec.

### Routes with zero end-to-end coverage

- `/reports` — the ReportsPage card grid (685 lines) is only ever *navigated to*
  by the back button and the auth redirect. None of its own behaviour is tested.
- `/settings/company`
- `/settings/vat`
- `/onboarding` and the `OnboardingGate` redirect
- The PDF export flow — the export modal on `/subcontractor-payments`, and
  `POST /projects/reports/export-pdf` behind it
- `NotFoundPage` / `ErrorPage`
- i18n and RTL (PR #46's entire test plan is still manual)

### What the PDF export *does* have

`pdf-export.service.spec.ts` (14 tests) and `pdf-export.controller.spec.ts`.
Every collaborator is a `jest.fn()` and puppeteer is module-mocked, so these
cover the service's own branching and arithmetic — and nothing else. Untested
today: the real `findForSubcontractorAndClientInMonth` query, real VAT
carry-forward resolution, the real tag join, the template against real rows, the
HTTP response headers, DTO validation, and the whole browser journey.

---

## 2. Part A — PDF project-report export

### A0. Infrastructure that must land first ✅

Four blockers. None of the PDF tests below can be written until these are done.

#### A0.1 Seed a baseline VAT rate in `global-setup.ts`

`PdfExportService` calls `vatRatesService.resolveForMonth()` and throws
`VatRateNotConfiguredError` on `null`. The e2e database has no `vat_rates` row,
so **every export in the suite would 400 today**. Add a baseline alongside the
existing `companySettings` upsert:

```ts
await prisma.vatRate.upsert({
  where: { effectiveMonth: new Date('2020-01-01') },
  update: { percentage: 18 },
  create: { effectiveMonth: new Date('2020-01-01'), percentage: 18 },
});
```

Effective far enough back that carry-forward covers every month a test touches.
18 divides cleanly enough for hand-checked assertions.

#### A0.2 Extend the fixture teardown to cover the singletons

`fixtures/db.fixture.ts` truncates seven business tables. It does **not** touch
`vat_rates` or `company_settings` — both of which the new tests need to mutate:

- A VAT row left behind by one test changes what later months resolve to
  ("most recent effective on or before"), so it silently corrupts every
  subsequent export assertion.
- A settings test that blanks `name` breaks the PDF precondition *and* trips
  `OnboardingGate` into redirecting every route afterwards.

Factor the canonical seed into `fixtures/seed.ts`, import it from both
`global-setup.ts` and the fixture, and in teardown:

```ts
await prisma.vatRate.deleteMany({
  where: { effectiveMonth: { gt: BASELINE_VAT_MONTH } },
});
await prisma.companySettings.upsert({ /* canonical row */ });
```

Deleting only rows *after* the baseline keeps the baseline itself intact for the
next test.

#### A0.3 Give the backend under test a Chromium for Puppeteer

The backend spawned by `global-setup.ts` runs `puppeteer.launch()` for real.
Two hazards:

- `ci.yml` sets `PUPPETEER_SKIP_DOWNLOAD: "true"` globally, with a comment
  saying nothing in CI drives a real browser. That stops being true the moment
  a PDF e2e test exists.
- `e2e.yml` does *not* set it, so today's install happens to fetch puppeteer's
  Chromium into `~/.cache/puppeteer` — uncached, re-downloaded every run, and
  entirely implicit.

Fix both by reusing the Chromium the e2e job already installs. In
`global-setup.ts`, resolve Playwright's binary and hand it to the backend:

```ts
import { chromium } from '@playwright/test';
// …
PUPPETEER_EXECUTABLE_PATH: chromium.executablePath(),
```

Then `e2e.yml` can set `PUPPETEER_SKIP_DOWNLOAD: "true"` like `ci.yml` and skip
the second download altogether. Add a preflight that throws with a clear message
if no executable resolves — better than the first PDF test dying on a 30 s
timeout with nothing to read.

#### A0.4 A dependency-free PDF assertion helper — `fixtures/pdf.ts`

- `expectValidPdf(buf)` — asserts the `%PDF-` magic bytes and a trailing `%%EOF`
- `pdfPageCount(buf)` — counts `/Type /Page` occurrences

Deliberately **no text extraction.** Pulling in `pdfjs-dist` to read Hebrew text
back out of subset-embedded fonts is brittle, and every figure worth asserting
is already assertable one layer down against the rendered HTML. Playwright's job
is "a valid one-page PDF was downloaded under the right name"; content lives in
A1.

---

### A1. `apps/backend/test/pdf-export.e2e-spec.ts` — new integration spec ✅

The highest-value new file in this plan. Real Postgres testcontainer, real
services, real template; puppeteer mocked so the HTML handed to `setContent` can
be asserted. This is where the export's *correctness* gets pinned down.

**Scoping and month isolation**

1. One row per project report matching the subcontractor + client + month
2. Excludes the same subcontractor's reports under a *different* client
3. Excludes a *different* subcontractor's reports under the same client
4. Excludes adjacent months — seed rows dated one day either side of the
   boundary and assert they don't appear
5. A mid-month `month` value (`2026-05-17`) normalizes to the month start and
   still resolves the reports

**VAT resolution**

6. The invoice-incl-VAT column is `income × (1 + vat/100)` at the rate resolved
   for that month
7. A rate set for a *later* month leaves an earlier month's export unchanged
8. A rate carried forward from an earlier month is used when the export month
   has none of its own
9. 400 `VatRateNotConfiguredError` when nothing is effective on or before the
   month (delete the baseline for this case)

**Financial roll-up**

10. Supplier rows flatten corporation payments across every report in the month;
    the deductions total equals their sum
11. `paymentExclVat = Σ afterProfit − Σ supplier`, and
    `paymentInclVat = paymentExclVat × (1 + vat/100)`
12. A report with several income entries collapses to one row at `totalIncome`

**Tags** (the join `pdf-export.service.spec.ts` can only fake)

13. A subcontractor payment's tag for the month lands in that project's tag cell
14. Several partial payments on one project join with ` · `
15. A project with no payment renders an empty tag cell

**Company settings**

16. 400 when `name` is blank; 400 when `companyNumber` is blank
17. Logo and signature data URLs render into the HTML; omitted when null
18. Address renders `"street, city"` — and street-only, city-only, and omitted
    entirely when both are null. This `filter(Boolean).join(', ') || null`
    branch has no test at any layer today.

**Template**

19. `lang: 'he'` → `dir="rtl"`; `lang: 'en'` → `dir="ltr"`; omitted → Hebrew
20. HTML-escaping: `<script>`, `&`, and quotes in a client / project /
    subcontractor name or in `approvedFor` come out escaped

**Not found**

21. 404 `NoReportsForExportError` when the triple matches nothing

**One un-mocked render**, tagged so it can be skipped where no Chromium exists:

22. A real `puppeteer.launch()` produces a valid one-page PDF

**Controller level** (supertest against the built Nest app)

23. `Content-Type: application/pdf`, `Content-Disposition: attachment;
    filename="account-approval-2026-05.pdf"`, `Content-Length` equal to the body
    length
24. DTO validation → 400: missing `approvedFor`; `approvedFor` over 500 chars;
    `lang: 'fr'`; a non-ISO `month`; an unknown extra property
    (`forbidNonWhitelisted` is on)
25. Unauthenticated POST → 401 via the global `JwtAuthGuard`

---

### A2. `apps/e2e/tests/pdf-export.spec.ts` — new Playwright spec ✅

The user journey from `/subcontractor-payments`. Seeds mirror the existing
`subcontractor-payments.spec.ts` beforeEach.

**Modal mechanics**

1. The Export PDF button sits on the selected subcontractor's panel; clicking it
   opens the modal
2. One distinct client → no client Select is rendered and export proceeds on the
   auto-selected id (`distinctClients.length === 1`)
3. Two distinct clients → the Select renders, defaults empty, and Save does
   nothing until a client is picked (`handleExport` early-returns)
4. Blank "Approved For" → Save does nothing, the modal stays open, and no
   request fires (assert with a request counter, not just the absence of a
   toast)
5. `FormModal loading={exporting}` shows while the request is in flight

**Happy path**

6. A download fires, named `account-approval-2026-05.pdf`, and the bytes are a
   valid one-page PDF (`fixtures/pdf.ts`)
7. The request body carries the right `subcontractorId`, `clientId`,
   `month: '2026-05-01'`, and a *trimmed* `approvedFor`
   (`page.waitForRequest` → `postDataJSON()`)
8. Success toast appears and the modal closes
9. The language toggle drives the payload: Hebrew sends `lang: 'he'`, English
   sends `lang: 'en'`

**Error paths** — real backend failures, not stubbed responses, so the assertion
actually proves the server produces that message. Each mutates a singleton and
relies on the A0.2 restore.

10. VAT missing → toast reads "No VAT rate has been configured for or before …",
    modal stays open, no download
11. Company name blanked → toast reads "Company settings must have a name and
    company number configured before exporting a PDF"
12. A month with no reports for that subcontractor → 404 toast, no download

**Cross-feature**

13. A tag typed into the projects table is written before the export reads it,
    and reaches the export request — the write-then-read ordering that
    `findTagsByProject` depends on

---

## 3. Part B — the rest of the e2e gaps

### B1. `tests/reports-list.spec.ts` — `/reports` ✅

The largest untested page in the app.

- The month picker scopes the card grid; changing month re-filters
- Received / Pending badge per card follows `incomeDate`
- Clicking a card navigates to `/reports/projects/:id`
- Creating a report from this page's own modal: picking a client filters the
  project list, picking a project prefills subcontractor and margin from the
  previous month, corporation-payment rows add and remove
- The clients summary panel's `totalSubcontractorPayments` sums the month
- The profit-simulator panel: moving the margin slider updates the previewed
  profit and issues no write (PR #42's headline guarantee, currently unverified)
- Empty state and Add button on a month with no reports

### B2. `tests/settings.spec.ts` ✅

`/settings/company`:

- The form seeds from the saved row on load
- Save persists — assert against `db.companySettings.findFirst()`, not the UI
- Phone, email, street, city round-trip
- Logo and signature upload store a base64 data URL

`/settings/vat`:

- "Current VAT rate" shows the resolved rate, and "Not configured" when none is
- Saving upserts and the row appears in the history table
- History is ordered newest-first
- A second save for the same month overwrites rather than appending
  (`@unique effectiveMonth`)
- Out-of-range (−1, 101) and non-numeric input do not submit
- Carry-forward through the UI: set 17% effective 2026-01, then confirm 2026-05
  resolves to 17%

### B3. `tests/onboarding.spec.ts` ✅

- With the settings row deleted, any authenticated route redirects to
  `/onboarding`
- Completing onboarding writes the row and returns the user to the app
- With settings present, `/onboarding` is still reachable directly but nothing
  redirects to it

Needs the A0.2 restore, since it deletes the singleton every route depends on.

### B4. `tests/i18n.spec.ts` ✅

- Toggling to Hebrew sets `document.documentElement.dir = "rtl"` and translates
  the sidebar
- The choice survives a reload (`localStorage['beetbite.lang']`)
- A representative table right-aligns under RTL
- The sidebar active indicator moves to the other edge

### B5. Filling in the thin existing files ⬜ (partial)

| File | Add |
| --- | --- |
| `corporation-payments.spec.ts` (2) | Per-project breakdown tooltip; grand-total row; month isolation |
| `projects.spec.ts` (4) | Duplicate name rejected; empty-name validation; inline `isDone` toggle persists; completion bar reflects paid ÷ estimated; deleting a project that has reports |
| `income.spec.ts` (3) | Received / Pending filter pills; month grouping order |
| `clients` / `subcontractors` / `corporations` | Delete-while-referenced-by-a-report behaviour |
| `auth.spec.ts` (7) | Garbage or expired token → redirect to `/login`; a mid-session 401 clears the token (the `baseQueryWithReauth` logout branch) |

### B6. Cross-cutting ✅ — `tests/routing.spec.ts`

- An unknown route renders `NotFoundPage`, not the app shell
- `ErrorPage` renders on a router error
- The global error toast surfaces the server's message on a failing write — one
  representative case, since every page depends on it

---

## 4. Sequencing

1. **A0** — fixture, seed, Chromium wiring, PDF helper. Everything else blocks
   on this.
2. **A1** — the backend integration spec. Most coverage per line of test code,
   and no browser flake.
3. **A2** — the Playwright PDF journey.
4. **B1 – B3** — reports list, settings, onboarding. The three fully untested
   surfaces.
5. **B4 – B6** — i18n, fill-ins, cross-cutting.

Each numbered group is a separate PR. A1 and A2 in particular should not share
one: A1 is pure backend and can go green long before the Chromium plumbing
settles.

---

## 5. Risks

**Wall-clock.** The Playwright config is `workers: 1`, `fullyParallel: false`.
Roughly 55 new specs on top of 60 will about double the run. Every *real* PDF
render also launches a Chromium inside the backend (1–2 s each), which is
exactly why real renders are held to A1 #22 and the handful of A2 downloads —
everything else asserts against HTML at the integration layer. The e2e job's
30-minute timeout will need watching, and raising if it gets close.

**Shared singletons.** The settings, VAT, and onboarding tests mutate rows every
other test depends on, under a single worker, so order matters. The A0.2 restore
is what keeps this honest; pair it with `test.describe.serial` rather than
trusting file order.

**Hebrew in the PDF.** Not worth asserting through text extraction — the fonts
are subset-embedded and the output is not reliably searchable. Assert
`dir="rtl"` and the Hebrew labels on the HTML instead, and let the PDF layer
assert only structural validity.

**Puppeteer and CI drift.** `ci.yml`'s `PUPPETEER_SKIP_DOWNLOAD` comment
("nothing in CI drives a real browser") stops being true with this work. A0.3
resolves it by sharing Playwright's binary; the comment should be updated in the
same change so the next reader isn't misled.

---

## 6. Implementation notes

Two things turned out differently once the plan met the code.

### The real-render test cannot live in Jest

A1 originally carried a test that un-mocked puppeteer and rendered a real PDF.
That is impossible: **puppeteer v25 ships ESM only** — its `package.json`
resolves both the `import` and the `require` condition to the same ES module —
and Jest's CommonJS loader cannot `requireActual` it (`SyntaxError: Unexpected
token 'export'`). The application itself is fine, because Node 22 supports
`require(esm)`; it is specifically Jest's own module registry that cannot.

So the layering shifted:

- `pdf-export.e2e-spec.ts` stubs puppeteer outright and asserts the **HTML**.
  This is where every figure, scoping rule and escaping rule is pinned down.
- `apps/e2e/tests/pdf-export.spec.ts` is now the **only** place a real PDF is
  produced — the Playwright suite runs the backend as an ordinary Node process,
  where the ESM import works. `fixtures/pdf.ts` checks the downloaded bytes are
  a structurally valid single-page PDF.

This is a better split than the original anyway: the browser launch happens once
per relevant test in the layer that already owns a browser, instead of being
bolted onto a Jest run.

### A 500 that should have been a 400

A1's "reject a non-ISO month" case failed on first run — the API returned **500**,
not 400. The cause is in the DTO, not the test:

```ts
@Transform(({ value }: { value: string }) => normalizeToMonthStart(value))
```

`normalizeToMonthStart` throws `new Error('Invalid date')` on unparseable input.
class-transformer runs the transform *before* validation, so the throw escapes
the `ValidationPipe` as an unhandled error — the `@IsISO8601()` sitting right
next to it never gets a chance to report the problem. Any malformed date string
crashed the request instead of being rejected.

This was not specific to the PDF export: the same one-line pattern appears in
**six DTOs** — `create-project-report`, `export-project-reports-pdf`,
`create-subcontractor-payment`, `update-subcontractor-payment`,
`upsert-vat-rate`, and the shared `month-query`. Every date-carrying endpoint
answered malformed input with a 500.

Fixed centrally with a transform-safe wrapper in `date.utils.ts`:

```ts
export const normalizeToMonthStartForTransform = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  try {
    return normalizeToMonthStart(value);
  } catch {
    return value;
  }
};
```

Unparseable input now falls through untouched and the field's own
`@IsISO8601()` rejects it as a 400. `normalizeToMonthStart` keeps throwing for
its non-DTO caller (`VatRatesService.resolveForMonth`), where a bad date really
is a programming error.

### Remaining work

**B5** is the only section not built. The fill-ins for `corporation-payments`,
`income`, and the delete-while-referenced cases across the CRUD specs are still
open; `projects.spec.ts` and `auth.spec.ts` have their additions drafted.

One thing worth fixing while in here, though it is not a test gap:
`global-teardown.ts` kills the recorded frontend PID, which is the `pnpm`
wrapper — the `vite` grandchild survives. It does not bite CI, where every job
is a fresh runner, but it makes two consecutive local suite runs fail in a way
that looks like a broken test rather than a stale port.
