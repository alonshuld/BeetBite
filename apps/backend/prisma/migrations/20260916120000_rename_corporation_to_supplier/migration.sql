-- Rename Corporation -> Supplier.
-- Renames only: no table is dropped and no row is touched, so existing data
-- survives untouched. Constraint and index names are renamed explicitly because
-- Postgres carries them over verbatim when a table is renamed, which would
-- otherwise leave `corporation_*` names behind forever.

-- Tables
ALTER TABLE "corporations" RENAME TO "suppliers";
ALTER TABLE "corporation_payments" RENAME TO "supplier_payments";

-- Column
ALTER TABLE "supplier_payments" RENAME COLUMN "corporationId" TO "supplierId";

-- Primary keys
ALTER TABLE "suppliers" RENAME CONSTRAINT "corporations_pkey" TO "suppliers_pkey";
ALTER TABLE "supplier_payments" RENAME CONSTRAINT "corporation_payments_pkey" TO "supplier_payments_pkey";

-- Foreign keys
ALTER TABLE "supplier_payments" RENAME CONSTRAINT "corporation_payments_projectReportId_fkey" TO "supplier_payments_projectReportId_fkey";
ALTER TABLE "supplier_payments" RENAME CONSTRAINT "corporation_payments_corporationId_fkey" TO "supplier_payments_supplierId_fkey";

-- Indexes
ALTER INDEX "corporations_name_key" RENAME TO "suppliers_name_key";
