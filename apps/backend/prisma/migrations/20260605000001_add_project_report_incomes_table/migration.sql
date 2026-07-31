-- CreateTable
CREATE TABLE "project_report_incomes" (
    "id" TEXT NOT NULL,
    "projectReportId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "incomeDate" DATE,

    CONSTRAINT "project_report_incomes_pkey" PRIMARY KEY ("id")
);

-- MigrateData: move existing income rows into the new table
INSERT INTO "project_report_incomes" ("id", "projectReportId", "amount", "incomeDate")
SELECT gen_random_uuid()::text, "id", "income", "incomeDate"
FROM "project_reports"
WHERE "income" IS NOT NULL;

-- AlterTable: drop old columns from project_reports
ALTER TABLE "project_reports" DROP COLUMN IF EXISTS "income";
ALTER TABLE "project_reports" DROP COLUMN IF EXISTS "incomeDate";

-- AddForeignKey
ALTER TABLE "project_report_incomes" ADD CONSTRAINT "project_report_incomes_projectReportId_fkey" FOREIGN KEY ("projectReportId") REFERENCES "project_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
