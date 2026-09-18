-- CreateTable
CREATE TABLE "initiators" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "initiators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "initiator_payments" (
    "id" TEXT NOT NULL,
    "projectReportId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE,
    "description" TEXT,

    CONSTRAINT "initiator_payments_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "initiatorId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "initiators_name_key" ON "initiators"("name");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "initiators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiator_payments" ADD CONSTRAINT "initiator_payments_projectReportId_fkey" FOREIGN KEY ("projectReportId") REFERENCES "project_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiator_payments" ADD CONSTRAINT "initiator_payments_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "initiators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
