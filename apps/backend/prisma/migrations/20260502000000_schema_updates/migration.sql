-- Drop old columns from project_reports
ALTER TABLE "project_reports" DROP COLUMN IF EXISTS "income";
ALTER TABLE "project_reports" DROP COLUMN IF EXISTS "incomeDate";

-- Drop finishDate from projects (removed from schema)
ALTER TABLE "projects" DROP COLUMN IF EXISTS "finishDate";

-- Add isDone to projects
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "isDone" BOOLEAN NOT NULL DEFAULT false;

-- Create project_report_incomes table
CREATE TABLE IF NOT EXISTS "project_report_incomes" (
    "id" TEXT NOT NULL,
    "projectReportId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "incomeDate" DATE,

    CONSTRAINT "project_report_incomes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey for project_report_incomes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_report_incomes_projectReportId_fkey'
  ) THEN
    ALTER TABLE "project_report_incomes"
      ADD CONSTRAINT "project_report_incomes_projectReportId_fkey"
      FOREIGN KEY ("projectReportId") REFERENCES "project_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Make corporation_payments.date nullable and add new columns
ALTER TABLE "corporation_payments" ALTER COLUMN "date" DROP NOT NULL;
ALTER TABLE "corporation_payments" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "corporation_payments" ADD COLUMN IF NOT EXISTS "isFuture" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "corporation_payments" ADD COLUMN IF NOT EXISTS "vatPercentage" DECIMAL(5,2);

-- Modify subcontractor_payments: remove paymentDate, add projectId
ALTER TABLE "subcontractor_payments" DROP COLUMN IF EXISTS "paymentDate";
ALTER TABLE "subcontractor_payments" ADD COLUMN IF NOT EXISTS "projectId" TEXT;

-- Backfill projectId with a dummy value for any existing rows (idempotent for empty test DBs)
-- (No rows expected in test DBs at this point, but handle gracefully)
UPDATE "subcontractor_payments" sp
SET "projectId" = (
  SELECT pr."projectId" FROM "project_reports" pr
  INNER JOIN "project_report_incomes" pri ON pri."projectReportId" = pr."id"
  LIMIT 1
)
WHERE "projectId" IS NULL;

-- Make projectId NOT NULL
ALTER TABLE "subcontractor_payments" ALTER COLUMN "projectId" SET NOT NULL;

-- Add FK for subcontractor_payments.projectId
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subcontractor_payments_projectId_fkey'
  ) THEN
    ALTER TABLE "subcontractor_payments"
      ADD CONSTRAINT "subcontractor_payments_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

