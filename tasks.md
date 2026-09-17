# Lane B — surfaces

_Your tasks: T2+T8 → T3+T4 → T12 → T7 → T6._

This file is self-contained. You do not need to read docs/client-meeting-tasks.md
to work from it — every task you own is reproduced here in full, with its context,
its decisions, and its current state re-verified against the code. Read
docs/work-split.md only if you want the reasoning behind the split itself.

Lane A's file is docs/lane-a.md. Do not work from it.

---

## The invariant that outranks everything else

_Nothing in this backlog changes an existing financial calculation._ If a change
you are making moves a number that is already computed today, stop — you have
misread the task. This holds through rebases and merge resolutions too: if a merge
moves a number, the merge is wrong, not the number.

The formula, unchanged throughout:

profit = totalIncome × (profitMargin / 100)
corpTotal = Σ supplierPayments.amount
subPayment = totalIncome − profit − corpTotal

_This bites you hardest._ T7 and T12 each carry a test whose entire job is to
prove a number did not move, and T6 can silently corrupt stored margins if its
override map leaks into a write. Do not "fix" one of those tests to make a merge
green.

## Every task ships with tests

A PR that changes behaviour and adds no test is not finished, however obviously
correct it looks. Each task below carries a _Tests_ section naming the cases
that matter. Those are the minimum, not the ceiling.

| layer         | tool                                   | location              | what exists today                         |
| ------------- | -------------------------------------- | --------------------- | ----------------------------------------- |
| Backend unit  | Jest (\*.spec.ts)                      | colocated with source | 13 service, 10 controller, 4 mapper specs |
| Frontend unit | Vitest + Testing Library (\*.test.tsx) | colocated             | 38 files, components **and** pages        |
| End-to-end    | Playwright (\*.spec.ts)                | apps/e2e/tests/       | 15 specs, one per domain area             |

A new backend module needs _a service spec and a controller spec_, plus a mapper
spec if it has a mapper. That is the established pattern — match it, don't invent
a new one. Backend Jest has rootDir: src, testRegex: ._\.spec\.ts$ and the
^src/(._)$ module mapper. Frontend Vitest runs jsdom with src/test/setup.ts
and the @ alias. e2e tests get a real Postgres testcontainer and truncate all
tables after each test via fixtures/db.fixture.ts — use it rather than mocking
at that layer.

No coverage thresholds are configured and this backlog does not add any.

## Conventions

- Monorepo: apps/backend (NestJS + Prisma), apps/frontend (Vite + React +
  RTK Query), apps/e2e (Playwright). Read the per-app CLAUDE.md first.
- All routes are prefixed api/v1.
- After _any_ backend DTO change: pnpm --filter frontend codegen (backend must
  be running).
- Pre-commit runs pnpm format:check then pnpm lint:check. Run
  pnpm format && pnpm lint before committing.
- UI is bilingual he/en via apps/frontend/src/contexts/langContext.ts. Every
  user-facing string needs _both_ locales. Hebrew is RTL — check rtl: Tailwind
  variants on anything laid out horizontally. **You add more user-facing strings
  than Lane A does; every one of them needs both locales, and several of your
  tasks require a test asserting exactly that.**
- Money is Decimal(12,2) in Prisma, number over the wire.
- There is no real production data yet. Migrations may be destructive where that
  produces a cleaner schema.

---

## Your files, their files

_You own_ — edit freely:

apps/frontend/src/pages/ReportsPage.tsx (+ test)
apps/frontend/src/pages/ProjectReportsPage.tsx (+ test)
apps/frontend/src/pages/ProfitSimulatorPage.tsx (+ test) ← T6 deletes both
apps/backend/src/pdf-export/** (service, templates, DTOs, errors)
apps/backend/src/initiators/** + initiator-payments/\*\* ← you create these

_Lane A owns_ — do not edit; ask instead:

apps/backend/src/corporations|suppliers/**
apps/backend/src/corporation-payments|supplier-payments/**
apps/backend/src/subcontractor-payments/**
apps/backend/src/income/**
apps/backend/src/clients/\*_
apps/frontend/src/pages/SuppliersPage._ SupplierPaymentsPage._ SubcontractorPaymentsPage._

_One exception runs against you:_ Lane A's T1 rename (their phase 0) rewrites
ReportsPage.tsx, ProjectReportsPage.tsx and report-approval.template.ts
because it must. That is why T1 goes first and merges fast. **Rebase onto it the
moment it lands** — before that, expect Corporation to still be Corporation.

### Contested files

apps/frontend/src/pages/ProjectsPage.tsx and apps/backend/src/projects/\*\* are
visited by both lanes, in this order, never simultaneously:

| phase | who    | what                                    |
| ----- | ------ | --------------------------------------- |
| 0     | _you_  | T2/T8 — requesterName + location fields |
| 1     | Lane A | T14 — transfer action, client select    |
| 3     | _you_  | T7 — initiator select                   |
| 4     | Lane A | T11 — opening-balance section           |

Rebase onto dev at the start of every phase and this costs you nothing.

### Two standing rules

1. _langContext.ts is append-only._ Both lanes add keys in nearly every task.
   Add yours at the end of each locale object. Never reformat, re-sort or
   re-indent the file — a cosmetic pass turns every parallel edit into a conflict.
2. _Never hand-resolve a conflict in generated code._ apps/backend/src/generated
   and apps/frontend/src/api/generated regenerate themselves. On conflict:
   git checkout --ours the whole tree, then
   pnpm --filter backend exec prisma generate && pnpm --filter frontend codegen.
   Review the regenerated diff, never the merged one.

### Schema convention

Both lanes add columns to model Project. **You insert new fields above the
relation block; Lane A appends at the bottom of the model.** That turns a merge
conflict into a clean two-sided add.

### Branch convention

lane-b/t2-t8-requester-location
lane-b/t3-t4-export-dialog
lane-b/t12-income-tags
lane-b/t7-initiator
lane-b/t6-simulator-export

Branch off dev. One PR per entry below.

---

## A map of ReportsPage.tsx, since you live there

774 lines, and you touch a different region of it in four of your five PRs. Know
which is which:

| region                                    | lines   | which task                                |
| ----------------------------------------- | ------- | ----------------------------------------- |
| IncomeEntryDraft type                     | 41      | T12                                       |
| simMargin state                           | 79      | T6                                        |
| corpPayments draft rows state             | 90      | T7 (pattern to copy)                      |
| exportReport / approvedFor state          | 94-95   | T3, T4                                    |
| handleExport                              | 98-110  | T3, T4                                    |
| totalSubcontractorPayments memo           | 148     | T7 (must not move)                        |
| client header totals                      | 323-325 | _Lane A's T13_ — keep out                 |
| <ProjectSheet> call site                  | 343     | T8                                        |
| inline profit simulator                   | 362-378 | T6                                        |
| income entry tag input (add-report modal) | 544     | T12                                       |
| corpPayments.map draft rows               | 575     | T7                                        |
| export FormModal                          | 627-660 | T3, T4                                    |
| ProjectSheet component                    | 672-770 | T8 (header), T7 (rows), T12 (income rows) |
| entry.tag display                         | 718     | T12                                       |

_(The original backlog cites the tag input at :541; it is :544 on current
dev. Everything else above is verified as listed.)_

---

---

# PR 1 — T2 + T8: requesterName and location on Project

Two tasks, one PR. Both add a _required_ column to Project, both edit the same
project form, both want the same migration window. The backlog recommends batching
them and it is right.

_Start this immediately — do not wait for T1._ Verified: neither
apps/backend/src/projects/\** nor ProjectsPage.tsx appears anywhere in T1's
77-file list. The only three files both PRs touch are pdf-export.service.ts,
report-approval.template.ts and ReportsPage.tsx, and in each case in a
different region. *Rebase onto T1 the moment it merges.\*

---

## T2 — requesterName (מזמין): new per-project field, printed on the PDF

_Notes:_ "לכל פרוייקט אמור להיות שם מזמין" (20:04),
"השלמה אוטומטית לשם המזמין" (20:06),
"זאת אומרת שזה אמור להחליף את השדה pdf" (20:47)

_Decisions:_ a _brand-new required field on Project_, free text with
autocomplete over previously used values. The Client relation is untouched and
remains the grouping on the reports screen. On the PDF the requester _replaces_
the client, and _the client's name then appears nowhere on the document_.

_Size:_ M · _Risk:_ low

### Why a separate field

Client is the account work is grouped and billed under. The _מזמין_ is who
commissioned this particular project and whose name belongs on that project's
approval document. They frequently differ — one client commissions several
projects through different people — so the PDF has been printing the wrong name.

### Verified current state

pdf-export.service.ts:103, inside the renderReportApprovalHtml call:

ts
const html = renderReportApprovalHtml({
lang: dto.lang ?? 'he',
contractorName: companySettings.name,
contractorCompanyNumber: companySettings.companyNumber,
contractorDescription: companySettings.description,
clientName: report.project.client.name, // ← line 103, the bug
subcontractorName: subcontractor.name,
...

And report-approval.template.ts:44, inside LABELS.he:

ts
client: 'שם המזמין:',

_The Hebrew label already says "שם המזמין" and needs no change_ — only its data
source was wrong. That is the whole point of this task: a one-line swap that has
been printing the wrong name.

### Work

1. _Schema_ — add requesterName String (_required_) to model Project,
   above the relation block. No data to backfill. If a dev database has rows, add
   with DEFAULT '' and drop the default in the same migration.
2. _Backend DTOs_ — add to create-project.dto.ts (@IsString, @IsNotEmpty,
   @MaxLength, @ApiProperty), update-project.dto.ts,
   project-response.dto.ts, project-basic-response.dto.ts, and the mapper.
3. _PDF — the point of the request._ In pdf-export.service.ts:103:
   diff

   - clientName: report.project.client.name,

   * requesterName: report.project.requesterName,

   Rename the template field clientName → requesterName in
   ReportApprovalData while you are there, so it stops lying about what it holds.
   After this change the document names the contractor, the requester, the project
   and the subcontractor. **The client is internal-only and is not printed
   anywhere.**

4. _Project form_ (ProjectsPage.tsx) — required text input labelled מזמין /
   Requester with autocomplete over previously used values. Cheapest correct
   implementation: a <datalist> fed by the distinct requesterName values
   already in the useGetProjectsQuery() result. _No new endpoint._
5. _Display_ — show the requester on the project card/table.
6. pnpm --filter frontend codegen.

### Cleanup to fold into the same PR

The frontend advertises a state the schema forbids. Project.clientId is a
_non-nullable FK_, yet the UI offers "no client". Verified:

langContext.ts:166 clientOptional: "Client (optional)"
langContext.ts:167 noClientOption: "— No client —"
langContext.ts:390 clientOptional: "לקוח (אופציונלי)"
langContext.ts:391 noClientOption: "— ללא לקוח —"
ProjectsPage.tsx renders <option value="">{t("noClientOption")}</option>
ProjectsPage.tsx:339 project.client?.name ?? "—"

Drop the empty option, drop "(optional)", mark the select required, tighten the
frontend type so client is non-optional. Removes a way to hit a confusing server
error.

_Note for Lane A's T14:_ they are about to rework client resolution and will
touch ProjectsPage.tsx:152 and :339. Removing the "no client" fiction here
makes their job easier, not harder — but tell them it's coming.

### Tests

- _🔴 PDF export service_ — asserts the template receives the project's
  requesterName, and that the client's name is _not_ passed. This is the crux
  of the task; without it the one-line change can silently regress.
- _PDF template_ — the שם המזמין: row renders the requester.
- Project service/mapper — create and update carry requesterName; the response
  DTO exposes it.
- Validation — a project without a requester is rejected.
- ProjectsPage.test.tsx — the field is required; the datalist offers distinct
  requester names already used on other projects, and still accepts a new value.
- Cleanup regression — the client select no longer renders an empty option.
- e2e projects.spec.ts — create a project with a requester; pdf-export.spec.ts
  — the exported document shows the requester and _not_ the client name.

### Acceptance

- A project cannot be created or saved without a requester name.
- Typing suggests requester names used on other projects, while still accepting a
  new value.
- The PDF's שם המזמין: row shows the _project's requester_.
- The client's name appears _nowhere_ on the PDF.
- Client grouping on the reports screen and the clients page are unchanged.

---

## T8 — location on Project + richer tile header

_Note:_ _"בדף אחרי שבחרתי את הלקוח שיהיה רשום בכותרת של כל משבצת שם פרוייקט,
מיקום, ואז בקטן את התיאור"_ (20:56)

_Decision:_ _new required field_ on Project.

_Size:_ S · _Risk:_ low

### Work

1. _Schema_ — add location String (_required_) to model Project, in the
   same migration as requesterName. Same note: no data to backfill; use
   DEFAULT '' then drop it if a dev database has rows.
2. _DTOs_ — create/update/response + mapper, as T2.
3. _Project form_ — required text input, מיקום / Location.
4. _Tile header_ — ProjectSheet in ReportsPage.tsx (component at :672-770,
   called at :343) currently renders only report.project.name as a button.
   Restructure to:

   - _project name_ — primary, keeps the existing navigate-on-click behaviour
   - _location_ — beside or beneath the name, secondary weight
   - _description_ — beneath, in smaller muted type

   Keep the exportPdf button where it is. Watch the RTL layout and make sure a
   long description does not break the card's height alignment in the grid.

### Open point — decide before you build it

Should location also appear on the PDF? _Not requested, left out._ It is one
line in the template plus two labels if the answer changes. Ask the product owner
while you are in the file; it is cheaper now than in a follow-up.

### Tests

- Validation — a project without a location is rejected.
- Project DTOs/mapper carry location.
- ReportsPage.test.tsx — the tile header renders project name, location, then
  description; the project name is still clickable through to its reports.
- A long description does not break the card layout (assert structure, not pixels).
- Both locales; RTL ordering correct.
- e2e projects.spec.ts — create a project with a location and see it on the tile.

### Acceptance

- A project cannot be created or saved without a location.
- Each tile header reads: project name, location, then description in small type.
- Project name remains clickable through to the project's reports.
- Both locales, RTL correct, grid alignment preserved.

---

---

# PR 2 — T3 + T4: the export dialog

Two tasks, one dialog, one PR. Both live in the export FormModal at
ReportsPage.tsx:627-660 and handleExport at :98-110.

Lane A is in ReportsPage.tsx:126/:143/:298/:323 in this same phase (T14 + T13).
Different regions — git will merge them. Do not touch the client header.

---

## T3 — edit the project description from the export flow

_Note:_ "בייצוא pdf שיהיה אפשר לערוך את התיאור" (20:55)
_Decision:_ "add a new way to edit the description of the project"

_Size:_ S · _Risk:_ low

### Context

Project.description is a required String, editable today _only_ from the
Projects management page. The owner wants to reach it from where the document is
produced, without navigating away.

### Work

In the export dialog on ReportsPage.tsx (the exportReport FormModal), add a
Textarea bound to the project's description, saved via the existing
useUpdateProjectMutation on submit.

Keep it _visually distinct_ from the approvedFor field — different things, and
T4 persists one but not the other. A user who cannot tell them apart will not
understand why one is remembered and the other is not.

### Tests

- ReportsPage.test.tsx — the export dialog prefills the project's current
  description; editing and submitting calls the update mutation with the new text;
  cancelling does _not_ persist.
- Assert the description field is distinct from approvedFor — they are different
  fields with different persistence rules.

### Acceptance

- Dialog shows the project's current description, pre-populated.
- Editing and exporting persists the change; the Projects page reflects it.
- Cancelling does not persist.

---

## T4 — PDF export remembers the "עבור" text per project

_Note:_ "בייצוא pdf שישמר ה'עבור' מפעמים קודמות" (20:46)

_Decision:_ remember the "for who" field between exports. _Not_ chosen: a full
history/audit of past exports.

_Size:_ M · _Risk:_ low

### Verified current state

ExportProjectReportsPdfDto requires approvedFor (free text, max 500, rendered
as "חשבון מאושר עבור:" — the label is LABELS.he.approvedFor in
report-approval.template.ts). On ReportsPage.tsx:

:95 const [approvedFor, setApprovedFor] = useState("")
:98 if (!exportReport || !approvedFor.trim()) return
:103 approvedFor: approvedFor.trim()
:641 value={approvedFor}

setApprovedFor("") resets to empty on every open — so the same text is retyped
every month.

### Work

1. _Schema_ — add nullable lastApprovedFor String? to Project. Additive, no
   backfill. Same migration window as nothing else; this is your only Project
   column in this PR.
2. _Backend_ — on _successful_ export, persist approvedFor onto the project.
   Expose on the project response DTO.
3. _Frontend_ — prefill the dialog from project.lastApprovedFor instead of
   "". Fully editable; the prefill is convenience, not a lock.
4. pnpm --filter frontend codegen.

### Why Project and not ProjectReport

The text describes the scope of work ("עבודות שלד + גמר") — a property of the
project, stable across months. That is exactly why retyping it is annoying.

### Tests

- Backend — a successful export persists approvedFor onto the project; **a
  failed export does not.**
- Project response DTO exposes lastApprovedFor.
- ReportsPage.test.tsx — dialog is empty on a project that has never been
  exported, and prefilled from lastApprovedFor afterwards; the prefill is
  editable, not locked.
- Two projects keep independent values.
- e2e pdf-export.spec.ts — export a project twice; the second dialog opens
  prefilled with the first export's text.

### Acceptance

- First export of a project: empty, as today.
- Every subsequent export: prefilled with the last used text.
- Editing and exporting updates what is remembered.
- Two projects keep independent values.

---

---

# PR 3 — T12: add/edit the income entry tag from the report screens

_Note:_ "שיהיה אופציה לערוך / להוסיף את התיאור בהוספת תשלום מכל המסכים" (21:07)

_Clarification, verbatim:_

> "Currently we cannot edit the tag or add tag from some screens, this is what i
> ment"

_Decision:_ tag editing needed on _all three_ — the project report detail page,
inline on the project tiles, and an edit-report modal.

_Size:_ M · _Risk:_ low-medium — see the warning below

### Verified current state

ProjectReportIncome.tag (String? in the schema) can be set **only at report
creation**, in the add-report modal on ReportsPage.tsx (IncomeEntryDraft.tag
at :41, the input at :544). It is displayed at ReportsPage.tsx:718
({entry.tag ?? t("income")}) but there is **no way to change it afterwards from
anywhere in the app**.

The income module exposes only a @Get() — apps/backend/src/income/ contains
income.controller.ts, income.service.ts, income.module.ts and one DTO. There
is no per-entry write endpoint.

### ⚠️ Do not route tag edits through the report update endpoint

Verified at project-reports.service.ts:356-367:

ts
incomeEntries: updateProjectReportDto.incomeEntries
? {
deleteMany: {},
createMany: {
data: updateProjectReportDto.incomeEntries.map((e) => ({ ... })),
},
}
: undefined,

_Every income row is destroyed and recreated with new ids on any report update._
(The same pattern repeats at :369-380 for payments.) Editing one tag that way
churns ids, breaks anything holding a reference, and rewrites rows that were not
touched.

_Add a dedicated endpoint_ — e.g. PATCH /projects/reports/incomes/:id taking
{ tag } — that updates the single row in place. Small, and it avoids the
destroy-and-recreate entirely.

_(That delete-and-recreate is worth a separate look on its own merits. **Out of
scope here — do not fix it inside this task.** It is logged as an unowned
follow-up ticket.)_

### Note on the income module's ownership

apps/backend/src/income/** is **Lane A's\** file set — they rework it in T14. Your
new endpoint patches ProjectReportIncome, which is project-reports territory, not
the monthly-income read model. *Put it under project-reports/, not income/.\*
That keeps you out of their files and is the more honest home for it anyway: it
writes a row that belongs to a report.

### Work

1. _Backend_ — new endpoint patching one income entry's tag, under
   project-reports/. DTO with @IsOptional() @IsString() @MaxLength(...),
   allowing null to clear.
2. _Project report detail page_ (ProjectReportsPage.tsx) — inline edit on each
   income row.
3. _Project tiles_ (ReportsPage.tsx, ProjectSheet, the display at :718) —
   inline edit on the income rows without opening anything. Match the light-touch
   pattern of the existing VatInput on the payments page: edit in place, small
   confirm affordance.
4. _Edit-report modal_ — reachable from the tile, mirroring the add-report modal
   so tags can be edited alongside everything else.
5. pnpm --filter frontend codegen.

### Open point — decide before you start step 4

Does a _general edit-report modal_ need building, or is the third surface scoped
to tags only? The backlog leaves this open and it is the difference between S and
M for this PR. Decide first; the answer changes how much of step 4 exists.

### Tests

- _🔴 Patching a tag does not recreate income rows._ Capture the entry ids before
  and after, and assert they are unchanged. This is the exact trap the task exists
  to avoid — routing through the report update endpoint would churn every id, and
  this is what catches it.
- Tag can be set, changed, and cleared to null.
- Amounts, dates, and every derived figure are untouched by a tag edit.
- Validation — over-long tags rejected.
- All three surfaces: ProjectReportsPage.test.tsx, the inline edit on the tiles
  in ReportsPage.test.tsx, and the edit-report modal.
- e2e project-reports.spec.ts — set a tag at creation, change it afterwards, and
  confirm the amount is unaffected.

### Acceptance

- A tag can be added, changed and cleared from all three places.
- Editing a tag does _not_ recreate income rows or change their ids.
- Amounts, dates and every derived figure are untouched by a tag edit.
- Both locales; RTL correct.

---

---

# PR 4 — T7: Initiator (יזם) — entity, optional link, documentation-only payments

_Notes:_ "יזם אופציונלי בפרוייקט" (20:06),
"להוסיף יזמים בניהול... אופציה לתעד תשלומים ליזם" (21:03),
"חשבון שאושר על ידי מזמין וחשבון שאושר על ידי יזם" (21:04)

_Decision, verbatim:_

> "if it exists we just want to be able to add to the project report just like
> corporation payment a payment to him, this is needed just so that it would be
> documented in the pdf, it does not touch any calculation just another field that
> should be documented in the project reports and in the pdf. Again only if it
> exists at all"

Code name _Initiator_ — not Developer, which collides with software
vocabulary. _Managed entity with its own CRUD page. No second PDF._

_Size:_ M · _Risk:_ LOW — touches no calculation

> Uses post-T1 naming. Supplier is what Corporation used to be.

### The rule that defines this task

_Nothing here changes any number that is already calculated._ The formula stays
exactly as it is:

profit = totalIncome × (profitMargin / 100)
corpTotal = Σ supplierPayments.amount
subPayment = totalIncome − profit − corpTotal ← unchanged

An initiator payment is recorded and displayed. It is _not_ subtracted from
anything, _not_ added to any total, and _not_ reflected in what the
subcontractor is owed. **If initiatorTotal appears inside an arithmetic
expression, that is a bug.**

### Scope

1. _Initiator model_ — id, name (unique), mirroring Supplier, plus a
   payments back-relation. For reference, the model you are mirroring:
   prisma
   model Supplier {
   id String @id @default(cuid())
   name String @unique
   payments SupplierPayment[]
   @@map("suppliers")
   }
2. _Management page_ — CRUD mirroring SuppliersPage, **including the search box
   from 183147c** (the T0 work already on dev). Add to Sidebar.tsx and
   router.tsx. (Lane A touched both in T1 — rebase first, then add your route.)
3. _Optional link on Project_ — initiatorId String?, _nullable_ (unlike
   clientId). Selectable in the project create/edit form (note 20:07: "all of
   this at project creation"). Add the field above the relation block, per the
   schema convention.
4. _InitiatorPayment_ — projectReportId, initiatorId, amount Decimal(12,2),
   date DateTime?, description String?, both relations onDelete: Cascade. Add
   initiatorPayments to ProjectReport.
   - _Skip isFuture and vatPercentage._ They exist on SupplierPayment to
     drive VAT resolution and the effective-total column — machinery a
     documentation-only row does not need. **Do not copy fields just because the
     sibling model has them.**
5. _Report form + tile — both screens._ Payments attach to a _report_
   (projectReportId), so every report of a project that has an initiator can
   document payments to them, multiple per report.
   - ReportsPage.tsx — the add-report modal, when the selected project has an
     initiator: initiator payment rows using the corpPayments draft-row pattern
     (:90 for the state, :575 for the rows).
   - ProjectReportsPage.tsx — the per-project drill-down at
     /reports/projects/:id, where reports are viewed and edited. **Do not skip
     this one** — it is the other place a report is maintained, and it is the one
     most likely to be forgotten.
   - The tile lists initiator rows as informational, styled so they clearly do
     _not_ participate in the subtotal above the subcontractor line.
6. _PDF_ — add the initiator's name and payment rows to
   report-approval.template.ts alongside supplierRows. Single approval
   addressed to the מזמין. Labels in _both_ LABELS.he and LABELS.en.

### Gating — "only if it exists at all"

- _No initiator on the project_ → no section in either form, no rows on the tile,
  _no initiator block on the PDF at all_ — not an empty heading, not a zero row,
  absent.
- _Initiator but no payments this month_ → _print the initiator's name anyway._
  Knowing who initiated the project is itself the documentation. Only the payment
  rows are conditional on there being payments.

### Worth doing while you are here — but coordinate

The subcontractor-remainder formula is _copy-pasted_ across ReportsPage.tsx
(totalSubcontractorPayments at :148, ProjectSheet, the inline simulator) and
SubcontractorPaymentsPage.tsx. Extracting it into one shared helper is good on
its own merits, and makes it structurally obvious that initiator payments are not
part of it.

**⚠️ SubcontractorPaymentsPage.tsx is Lane A's file, and they are editing it in
this same phase (T9/T10).** The split:

- _You_ extract the helper (into src/lib/ or equivalent) and apply it to
  ReportsPage.tsx only.
- _Lane A_ adopts it in SubcontractorPaymentsPage.tsx, in their T9/T10 PR if
  your helper has landed, otherwise as a two-line follow-up.

Neither lane edits the other's call site. Tell them when the helper merges.

### Tests

- **🔴 The test that defines this task: record an initiator payment and assert the
  subcontractor's remainder does not move.** Also assert
  totalSubcontractorPayments, the simulator output, and the existing PDF totals
  are byte-identical before and after. If initiatorTotal ever leaks into an
  arithmetic expression, this is what catches it.
- Initiator service + controller specs, mirroring the supplier ones.
- InitiatorPayment create/update/delete, scoped to a report.
- _PDF gating, three cases:_ no initiator → block entirely absent (not an empty
  heading, not a zero row); initiator with no payments → _name printed_, no rows;
  initiator with payments → name and rows.
- Both locales.
- _Both edit surfaces_ — ReportsPage.test.tsx (add-report modal) and
  ProjectReportsPage.test.tsx (the per-project drill-down).
- _New e2e spec apps/e2e/tests/initiators.spec.ts_ — CRUD, attach to a project,
  record a payment on a report, confirm it appears on the exported PDF. A new
  domain area gets its own spec file; that is the established pattern.

### Acceptance

- Initiators CRUD page with search, reachable from the sidebar.
- A project can be created and edited with or without an initiator.
- On _any_ report of a project with an initiator — from either screen — payment
  rows can be added, edited and deleted.
- _Every existing financial figure is identical before and after_: subcontractor
  remainder, totalSubcontractorPayments, the simulator, the subcontractor
  payments page, existing PDF totals.
- PDF shows the initiator name whenever the project has one; payment rows only when
  they exist; nothing at all when the project has no initiator.
- Migration additive; existing projects and reports keep working.

---

---

# PR 5 — T6: per-report simulator override + client-wide simulated PDF export

_Notes:_ "בסימולטור פר פרוייקט שיהיה אפשר לדרוס את הערך של הרווח" (20:24),
"אני רוצה שאני אוכל להדפיס את כל המשבצות עם הסימולטור" (20:36)

_Decision, verbatim:_

> "I want to be able to control each project report profit simulator and to be able
> to export to pdf the data as if so the simulator was the real profit margins,
> this is totally new export that includes all project reports of the client"

Document shape: _a summary page first, then the full per-project detail pages._
ProfitSimulatorPage.tsx: _harvest its logic, then delete it._

_Size:_ L · _Risk:_ medium-high — the largest remaining risk in the backlog.
This is last on purpose: by now you have owned the reports screen and every PDF
template for four phases.

---

## (a) Per-report override

The inline simulator on ReportsPage (:362-378, the profitSimulator block in
the client view) has a _single_ simMargin input (:79) applied uniformly to
every report. The owner wants one control per project report.

_ProfitSimulatorPage.tsx already implements this._ Verified at :31-32:

ts
const [baseline, setBaseline] = useState<number>(20);
const [overrides, setOverrides] = useState<Map<string, number>>(new Map());

— baseline slider plus a per-project override Map, with saved-vs-simulated deltas
(:42-43, :139). _It is dead code_, confirmed two ways: router.tsx:78-79 maps
path: "simulator" to <Navigate to="/reports" replace />, and nothing anywhere in
apps/frontend/src imports ProfitSimulatorPage except the file itself.

**Harvest that override logic into the inline simulator on ReportsPage, then
delete ProfitSimulatorPage.tsx and its test.** One simulator, in the place it is
actually used. _Do not write a third implementation._

## (b) New PDF export

A genuinely new document, distinct from the per-report account approval:

|          | existing export             | new export                                |
| -------- | --------------------------- | ----------------------------------------- |
| scope    | one ProjectReport           | _all_ of a client's reports for the month |
| margins  | stored profitMargin         | _the simulated overrides_                 |
| template | report-approval.template.ts | new template                              |
| trigger  | per-tile button             | client view, "export with simulator"      |

_Structure:_ a _summary page_ — one row per project showing income, simulated
margin, profit, supplier deductions and subcontractor remainder, with client totals
at the bottom — _followed by the per-project detail pages_, each in the familiar
account-approval layout but rendered at the simulated margin.

Simulated margins are _transient UI state and are never persisted._ The override
map goes in the request body and is applied server-side at render time.

### Work

1. Per-report margin controls in the ReportsPage inline simulator, reusing the
   harvested logic. Delete the orphan page and its test.
2. New DTO: client id, month, and a projectId → margin override map.
3. New template beside report-approval.template.ts, following its conventions:
   bilingual LABELS, escapeHtml on every interpolated value, formatCurrency,
   RTL dir, company logo/signature from CompanySettings.
4. New service method + controller route reusing the existing puppeteer pipeline.
5. Frontend "export with simulator" button in the client view, posting the current
   overrides and downloading the blob — mirror handleExport's
   URL.createObjectURL pattern (ReportsPage.tsx:98-110).

### Watch out

- _Reuse the existing errors_ — CompanySettingsIncompleteError,
  VatRateNotConfiguredError, NoReportsForExportError, all in
  apps/backend/src/pdf-export/errors/. The frontend already surfaces these via
  the global RTK Query error listener; a new error type would not be surfaced.
- _Validate the override map server-side_ — margins 0–100, and every projectId
  must belong to the client. _Never trust client input into a financial document._
- *"All of a client's reports for the month" means the *resolved client\*\* — Lane
  A's T14 (merged in phase 1) replaced report.project.client traversal with a
  resolveClientsForMonth(month) helper. Use it. Using project.client here would
  put a transferred project's history under the wrong client on a printed document.
- _T7 has landed by now_, so decide whether the initiator appears on this
  document too. T7 settles only the per-report PDF; this one is separate and the
  backlog leaves it open. Ask.

### Tests

- _🔴 Exporting with overrides does not mutate stored profitMargin._ Export
  with overrides, then re-read every report and assert the saved margins are
  unchanged. Without this the task can silently corrupt real data.
- Override-map validation — rejects margins below 0 or above 100, and a projectId
  that is not the client's.
- Service — the document covers _every_ report of that client for the month
  (resolved client, per T14), and figures are computed at the simulated margin, not
  the stored one.
- Template — renders the summary page and the per-project detail pages, in he and
  en.
- Reuses the existing errors (CompanySettingsIncompleteError,
  VatRateNotConfiguredError, NoReportsForExportError).
- ReportsPage.test.tsx — per-report overrides are independent of each other and
  of the baseline; reset restores saved values.
- _Delete ProfitSimulatorPage.test.tsx along with the page._ Do not leave a test
  for deleted code.
- e2e — set overrides, export, then assert the reports screen still shows the
  original saved margins.

### Acceptance

- Each project report has its own margin control; overrides independent.
- Export produces summary page + detail pages for every report of the client in the
  month, at simulated figures.
- Stored profitMargin values are _not_ mutated by simulating or exporting.
- Renders correctly in he and en.
- ProfitSimulatorPage.tsx is gone; no dead simulator remains.

---

---

# Open questions — decide before the phase that needs them

| when   | question                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| _PR 1_ | Should location print on the PDF? Not requested, left out. One line + two labels if the answer changes.                   |
| _PR 3_ | Does T12 need a general edit-report modal built, or is the third surface scoped to tags only? Changes the size of the PR. |
| _PR 5_ | Does the new client-wide simulated export show the initiator too? T7 settles only the per-report PDF.                     |

# What you depend on from Lane A

1. _End of their phase 0 — T1 merged._ Corporation is Supplier everywhere,
   routes are /suppliers and /supplier-payments. Rebase before continuing PR 1.
2. _End of their phase 1 — T14 merged._ "The client for a report" is now
   resolveClientsForMonth, not report.project.client. _Load-bearing for PR 5._

# What Lane A depends on from you

1. _PR 1_ — you remove the "no client" fiction from ProjectsPage; their T14
   reworks the same file next phase.
2. _PR 4_ — the extracted subcontractor-remainder helper, which they adopt in
   SubcontractorPaymentsPage.tsx. Tell them when it lands.
