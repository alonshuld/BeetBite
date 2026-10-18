-- AlterTable
ALTER TABLE "project_reports" ADD COLUMN     "incomePaidAt" DATE,
ADD COLUMN     "vatPaidAt" DATE;

-- MigrateData: a month whose income entries were all marked received counts as
-- paid, on the latest of their received dates. A month with any entry still
-- pending stays unpaid — paid is now all-or-nothing. No VAT payment was ever
-- recorded, so vatPaidAt starts empty everywhere.
UPDATE "project_reports" r
SET "incomePaidAt" = paid."lastDate"
FROM (
    SELECT "projectReportId", MAX("incomeDate") AS "lastDate"
    FROM "project_report_incomes"
    WHERE "amount" > 0
    GROUP BY "projectReportId"
    HAVING COUNT(*) = COUNT("incomeDate")
) paid
WHERE paid."projectReportId" = r."id";
