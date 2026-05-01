# Bug Fix Plan

## Execution Order

Schema changes first (BUGs 04, 05, 06) — downstream code depends on nullable types from migration. All other fixes are independent of each other.

---

## Step 1 — Prisma Schema (BUGs 04, 05, 06)

**File:** `prisma/schema.prisma`

Three changes in one migration:

| Bug | Model | Change |
|-----|-------|--------|
| BUG-04 | `SubcontractorPayment` | `paymentDate DateTime @db.Date` → `paymentDate DateTime? @db.Date` |
| BUG-05 | `SubcontractorPayment` | Add `@@unique([subcontractorId, serviceDate])` |
| BUG-06 | `CorporationPayment` | `date DateTime @db.Date` → `date DateTime? @db.Date` |

After editing schema:
```bash
pnpx prisma migrate dev --name fix-schema-nullable-and-unique
pnpx prisma generate
```

> ⚠️ BUG-05 unique constraint will fail if duplicate `(subcontractorId, serviceDate)` rows already exist in DB. Verify data is clean before migrating.

---

## Step 2 — Project Reports Mapper (BUG-01)

**File:** `src/project-reports/mappers/project-reports.mapper.ts:70`

```typescript
// before
paymentDate: projectReport.subcontractor.payments[0].paymentDate?.toISOString(),

// after
paymentDate: projectReport.subcontractor.payments[0]?.paymentDate?.toISOString(),
```

The type at line 49 already has `{ paymentDate: Date | null }[]` — no type change needed.

---

## Step 3 — Project Reports Service (BUGs 02, 03, 09, 11)

**File:** `src/project-reports/project-reports.service.ts`

### BUG-02 (line 92) — `||` → `??` for profitMargin

```typescript
// before
profitMargin:
  createProjectReportDto.profitMargin ||
  previousMonthProjectReport.profitMargin.toNumber(),

// after
profitMargin:
  createProjectReportDto.profitMargin ??
  previousMonthProjectReport.profitMargin.toNumber(),
```

### BUG-03 (lines 407-416) — replace `createMany` with `deleteMany` + `createMany` in `update()`

Prisma wraps nested `deleteMany` + `createMany` within a single `.update()` call atomically — no explicit `$transaction` needed.

```typescript
// before
corporationPayments: {
  createMany: {
    data: enrichedCreateProjectReportDto.corporationPayments.map(...),
  },
},

// after
corporationPayments: {
  deleteMany: {},
  createMany: {
    data: enrichedCreateProjectReportDto.corporationPayments.map(...),
  },
},
```

### BUG-09 (lines 375-380) — new `enrichUpdateProjectReportDto` method

Add a new private method that falls back to the **existing record** (not previous month's report) when `subcontractorId`/`profitMargin` are omitted:

```typescript
private async enrichUpdateProjectReportDto(
  id: string,
  updateProjectReportDto: UpdateProjectReportDto,
): Promise<UpdateProjectReportDto & Required<Pick<UpdateProjectReportDto, 'subcontractorId' | 'profitMargin'>>> {
  if (
    updateProjectReportDto.profitMargin !== undefined &&
    updateProjectReportDto.subcontractorId !== undefined
  )
    return updateProjectReportDto as UpdateProjectReportDto &
      Required<Pick<UpdateProjectReportDto, 'subcontractorId' | 'profitMargin'>>;

  const existingReport = await this.prismaService.projectReport.findUnique({
    where: { id },
    select: { subcontractorId: true, profitMargin: true },
  });

  if (!existingReport) throw new ProjectReportNotFoundError(id);

  return {
    ...updateProjectReportDto,
    profitMargin:
      updateProjectReportDto.profitMargin ?? existingReport.profitMargin.toNumber(),
    subcontractorId:
      updateProjectReportDto.subcontractorId ?? existingReport.subcontractorId,
  };
}
```

In `update()` at line 379, replace the call:
```typescript
// before
const enrichedCreateProjectReportDto =
  await this.enrichCreateProjectReportDto(updateProjectReportDto);

// after
const enrichedCreateProjectReportDto =
  await this.enrichUpdateProjectReportDto(id, updateProjectReportDto);
```

### BUG-11 (line 282) — wrong date in error message

```typescript
// before
throw new ProjectReportNotFoundError(projectId, monthQueryDto.month);

// after
throw new ProjectReportNotFoundError(projectId, previousMonthDate.toISOString());
```

---

## Step 4 — Subcontractor Payments Mappers + DTO (BUG-07)

Three files need null guards after schema makes `paymentDate` nullable (BUG-04).

**File 1:** `src/subcontractor-payments/mappers/monthly-subcontractor-payments.mapper.ts:35`
```typescript
// before
paymentDate: payment.paymentDate.toISOString(),
// after
paymentDate: payment.paymentDate?.toISOString(),
```

**File 2:** `src/subcontractor-payments/mappers/subcontractor-payment.mapper.ts:24`
```typescript
// before
paymentDate: subcontractorPayment.paymentDate.toISOString(),
// after
paymentDate: subcontractorPayment.paymentDate?.toISOString(),
```

**File 3:** `src/subcontractor-payments/dto/subcontractor-payments-response.dto.ts:32`
Make `paymentDate` optional to match nullable DB field:
```typescript
// before
paymentDate!: string;
// after
paymentDate?: string;
```

---

## Step 5 — Corporation Payments Service (BUG-08)

**File:** `src/corporation-payments/corporation-payments.service.ts:36-46`

Replace `calculateStartAndEndDates` with UTC-only implementation:
```typescript
private calculateStartAndEndDates(month: string): { startDate: Date; endDate: Date } {
  const ref = new Date(month);
  const startDate = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
  const endDate = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0));
  return { startDate, endDate };
}
```

---

## Step 6 — SubcontractorPayment Amount (BUG-10)

**Approach: Option 2** — keep `amount` stored, but compute and overwrite on `create`/`update` in the service instead of accepting the caller's value.

Rationale: Option 1 (remove from schema) changes the API response shape — `total` and `expectedTotal` in `MonthlySubcontractorPaymentsDto` would become redundant — and risks breaking the frontend. Option 2 is non-breaking and keeps the stored value fresh at write time.

**Files:**

`src/subcontractor-payments/subcontractor-payments.service.ts` — in `create()`, compute amount before writing:
```typescript
// before: data: { ...createSubcontractorPaymentDto }
// after: compute then override amount
const computedAmount = await this.calculateSubcontractorExpectedTotal(
  createSubcontractorPaymentDto.subcontractorId,
  new Date(createSubcontractorPaymentDto.serviceDate),
);
// use computedAmount in the Prisma create data
```

In `update()`, fetch the existing record to get `subcontractorId`/`serviceDate`, then recompute amount.

`src/subcontractor-payments/dto/create-subcontractor-payment.dto.ts` — make `amount` optional (it will be computed and ignored if provided):
```typescript
// before
@IsNumber()
@IsNotEmpty()
amount!: number;

// after
@IsNumber()
@IsOptional()
amount?: number;
```

---

## Affected Files Summary

| File | Bugs Fixed |
|------|------------|
| `prisma/schema.prisma` | 04, 05, 06 |
| `src/project-reports/mappers/project-reports.mapper.ts` | 01 |
| `src/project-reports/project-reports.service.ts` | 02, 03, 09, 11 |
| `src/subcontractor-payments/mappers/monthly-subcontractor-payments.mapper.ts` | 07 |
| `src/subcontractor-payments/mappers/subcontractor-payment.mapper.ts` | 07 |
| `src/subcontractor-payments/dto/subcontractor-payments-response.dto.ts` | 07 |
| `src/corporation-payments/corporation-payments.service.ts` | 08 |
| `src/subcontractor-payments/subcontractor-payments.service.ts` | 10 |
| `src/subcontractor-payments/dto/create-subcontractor-payment.dto.ts` | 10 |

---

## Verification

1. `pnpx prisma migrate dev` — migration applies cleanly
2. `pnpm build` — no TypeScript errors after nullable changes
3. `pnpm test` — all unit tests pass
4. `pnpm test:e2e` — integration tests pass against real DB
5. `GET /project-reports/:id` when no `SubcontractorPayment` exists → no crash (BUG-01)
6. `PATCH /project-reports/:id` with `corporationPayments` → exact set, no accumulation (BUG-03)
7. Create `SubcontractorPayment` without `paymentDate` → succeeds (BUG-04)
8. Create duplicate `SubcontractorPayment` (same subcontractor + serviceDate) → 409 (BUG-05)
9. Create `CorporationPayment` without `date` → succeeds (BUG-06)
10. `PATCH /project-reports/:id` with only `income` → keeps existing `subcontractorId`/`profitMargin` (BUG-09)
