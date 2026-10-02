-- Initiator payments are superseded by ProjectReport.initiatorIncome: one
-- figure per report, not itemised rows.
-- DropForeignKey
ALTER TABLE "initiator_payments" DROP CONSTRAINT "initiator_payments_initiatorId_fkey";

-- DropForeignKey
ALTER TABLE "initiator_payments" DROP CONSTRAINT "initiator_payments_projectReportId_fkey";

-- DropTable
DROP TABLE "initiator_payments";
