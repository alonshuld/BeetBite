-- DropForeignKey
ALTER TABLE "corporation_payments" DROP CONSTRAINT "corporation_payments_projectReportId_fkey";

-- DropForeignKey
ALTER TABLE "project_reports" DROP CONSTRAINT "project_reports_projectId_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_clientId_fkey";

-- DropForeignKey
ALTER TABLE "subcontractor_payments" DROP CONSTRAINT "subcontractor_payments_projectId_fkey";

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_reports" ADD CONSTRAINT "project_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporation_payments" ADD CONSTRAINT "corporation_payments_projectReportId_fkey" FOREIGN KEY ("projectReportId") REFERENCES "project_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_payments" ADD CONSTRAINT "subcontractor_payments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
