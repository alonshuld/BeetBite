-- DropForeignKey
ALTER TABLE "corporation_payments" DROP CONSTRAINT "corporation_payments_corporationId_fkey";

-- DropForeignKey
ALTER TABLE "project_reports" DROP CONSTRAINT "project_reports_subcontractorId_fkey";

-- DropForeignKey
ALTER TABLE "subcontractor_payments" DROP CONSTRAINT "subcontractor_payments_subcontractorId_fkey";

-- AddForeignKey
ALTER TABLE "project_reports" ADD CONSTRAINT "project_reports_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "subcontractors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporation_payments" ADD CONSTRAINT "corporation_payments_corporationId_fkey" FOREIGN KEY ("corporationId") REFERENCES "corporations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_payments" ADD CONSTRAINT "subcontractor_payments_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "subcontractors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
