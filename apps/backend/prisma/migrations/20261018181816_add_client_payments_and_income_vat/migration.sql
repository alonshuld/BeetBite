-- AlterTable
ALTER TABLE "project_reports" ADD COLUMN     "incomeIncludesVat" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "client_payments" (
    "id" TEXT NOT NULL,
    "projectReportId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentDate" DATE NOT NULL,

    CONSTRAINT "client_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_payments_projectReportId_idx" ON "client_payments"("projectReportId");

-- AddForeignKey
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_projectReportId_fkey" FOREIGN KEY ("projectReportId") REFERENCES "project_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MigrateData: every income entry already marked received becomes one client
-- payment of its amount on its received date, so the payment history starts
-- out matching what the received dates said. Zero entries carry no money.
INSERT INTO "client_payments" ("id", "projectReportId", "amount", "paymentDate")
SELECT gen_random_uuid()::text, "projectReportId", "amount", "incomeDate"
FROM "project_report_incomes"
WHERE "incomeDate" IS NOT NULL AND "amount" > 0;
