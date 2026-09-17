-- Timestamped after 20260916120000_rename_corporation_to_supplier: migrations
-- run in directory-name order, and the table is only called
-- "supplier_payments" once that rename has run.
-- AlterTable: existing payments default to unpaid, which is the honest answer
-- for rows recorded before the app tracked settlement at all.
ALTER TABLE "supplier_payments" ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT false;
