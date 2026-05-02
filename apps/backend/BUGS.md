# Bug Report

Generated: 2026-05-01

---

## BUG-01 — Crash on empty `payments` array in project-report mapper

**Severity:** High (runtime crash)
**File:** `src/project-reports/mappers/project-reports.mapper.ts:71`

```typescript
paymentDate: projectReport.subcontractor.payments[0].paymentDate?.toISOString(),
```

`payments` is filtered to only the entries matching `serviceDate`. If no `SubcontractorPayment` record exists yet for that subcontractor + service month, `payments` is `[]` and `payments[0]` is `undefined`. Accessing `.paymentDate` on `undefined` throws `TypeError` at runtime, crashing `GET /project-reports/:id`.

**Fix:** Guard the access:
```typescript
paymentDate: projectReport.subcontractor.payments[0]?.paymentDate?.toISOString(),
```

---

## BUG-02 — `profitMargin: 0` silently overridden during report creation/update

**Severity:** High (wrong financial data)
**File:** `src/project-reports/project-reports.service.ts:92`

```typescript
profitMargin:
  createProjectReportDto.profitMargin ||
  previousMonthProjectReport.profitMargin.toNumber(),
```

`||` treats `0` as falsy. A client explicitly providing `profitMargin: 0` (no-margin month) will silently have it replaced with the previous month's value. This produces incorrect financial calculations — wrong profit, wrong subcontractor payment.

**Fix:** Use nullish coalescing:
```typescript
profitMargin:
  createProjectReportDto.profitMargin ??
  previousMonthProjectReport.profitMargin.toNumber(),
```

---

## BUG-03 — Updating a project report accumulates corporation payments instead of replacing them

**Severity:** High (data corruption)
**File:** `src/project-reports/project-reports.service.ts:407–416`

```typescript
corporationPayments: {
  createMany: {
    data: enrichedCreateProjectReportDto.corporationPayments.map(...),
  },
},
```

`createMany` only appends new `CorporationPayment` rows. It never removes the existing ones. Every call to `PATCH /project-reports/:id` that includes `corporationPayments` accumulates records rather than replacing them. This corrupts `subcontractorPayment` calculations (which subtract all corporation payments), and produces wrong totals on `GET /project-reports/:id`.

**Fix:** Inside a transaction, delete existing payments then create new ones:
```typescript
corporationPayments: {
  deleteMany: {},   // deletes all payments for this report
  createMany: {
    data: enrichedCreateProjectReportDto.corporationPayments.map(...),
  },
},
```

---

## BUG-04 — `SubcontractorPayment.paymentDate` not nullable in schema (unpaid state impossible)

**Severity:** High (schema / domain mismatch)
**File:** `prisma/schema.prisma`

```prisma
model SubcontractorPayment {
  paymentDate DateTime @db.Date   // NOT nullable
```

According to the domain model (`CLAUDE.md`): `paymentDate?` is nullable — `null` means unpaid. The current schema makes the field required, so there is no way to record a subcontractor payment that has not yet been paid. Any attempt to create one without a payment date fails at the DB level.

**Fix:**
```prisma
paymentDate DateTime? @db.Date
```
Then add migration.

---

## BUG-05 — `CorporationPayment.date` not nullable in schema

**Severity:** Medium (schema / domain mismatch)
**File:** `prisma/schema.prisma`

```prisma
model CorporationPayment {
  date DateTime @db.Date   // NOT nullable
```

`CLAUDE.md` lists `date?` as nullable (payment date not always known). The current schema forces a date on every corporation payment, making it impossible to create a payment without specifying a payment date.

**Fix:**
```prisma
date DateTime? @db.Date
```

---

## BUG-06 — `calculateStartAndEndDates` uses local-time methods (timezone bug)

**Severity:** Medium (wrong query results in non-UTC environments)
**File:** `src/corporation-payments/corporation-payments.service.ts:40–45`

```typescript
const startDate = new Date(month);  // parses as UTC
startDate.setDate(1);               // mutates in LOCAL time
const endDate = new Date(startDate);
endDate.setMonth(endDate.getMonth() + 1);  // local time
endDate.setDate(0);                        // local time
```

`new Date(isoString)` produces a UTC moment. `setDate`/`setMonth` operate in the local timezone. On a server where `TZ` is not `UTC`, the computed `startDate` and `endDate` can fall in adjacent months, causing the query to miss payments or include payments from the wrong month.

**Fix:** Use UTC methods throughout:
```typescript
private calculateStartAndEndDates(month: string): { startDate: Date; endDate: Date } {
  const ref = new Date(month);
  const startDate = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
  const endDate = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0));
  return { startDate, endDate };
}
```

---

## BUG-07 — `findProjectReportForPreviousMonth` error reports wrong date

**Severity:** Low (misleading error message)
**File:** `src/project-reports/project-reports.service.ts:282`

```typescript
throw new ProjectReportNotFoundError(projectId, monthQueryDto.month);
```

The function queries the **previous** month's report, but the error message passes `monthQueryDto.month` (the input month, not the previous month). When the report is not found the error message references the wrong date, confusing callers.

**Fix:** Pass `previousMonthDate.toISOString()` instead of `monthQueryDto.month` to the error constructor.
