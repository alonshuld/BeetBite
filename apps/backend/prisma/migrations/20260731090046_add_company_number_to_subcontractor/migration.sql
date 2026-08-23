-- AlterTable
ALTER TABLE "subcontractors" ADD COLUMN "companyNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "subcontractors_companyNumber_key" ON "subcontractors"("companyNumber");
