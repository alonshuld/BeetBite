-- The VAT percentage is no longer stored per payment: it is derived at read
-- time from "vat_rates" for the report's month. Only the choice to charge VAT
-- is kept.

-- AlterTable
ALTER TABLE "supplier_payments" ADD COLUMN "includesVat" BOOLEAN NOT NULL DEFAULT false;

-- Keep the choice already made: a payment that carried a VAT percentage
-- included VAT. The percentages themselves are dropped below, so a payment
-- that used a custom rate now follows the global rate for its month.
UPDATE "supplier_payments"
SET "includesVat" = true
WHERE "vatPercentage" IS NOT NULL AND "vatPercentage" > 0;

-- AlterTable
ALTER TABLE "supplier_payments" DROP COLUMN "vatPercentage";
