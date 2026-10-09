-- Additive only: a new table plus a nullable column. Existing subcontractors
-- get teamId = NULL and behave exactly as before.

-- CreateTable
CREATE TABLE "subcontractor_teams" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subcontractor_teams_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "subcontractors" ADD COLUMN "teamId" TEXT;

-- CreateIndex
CREATE INDEX "subcontractors_teamId_idx" ON "subcontractors"("teamId");

-- AddForeignKey
ALTER TABLE "subcontractors" ADD CONSTRAINT "subcontractors_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "subcontractor_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
