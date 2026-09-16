-- AlterTable: existing payments default to unpaid, which is the honest answer
-- for rows recorded before the app tracked settlement at all.
ALTER TABLE "supplier_payments" ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT false;
