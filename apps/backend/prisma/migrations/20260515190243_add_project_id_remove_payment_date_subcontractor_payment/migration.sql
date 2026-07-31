/*
  Warnings:

  - You are about to drop the column `paymentDate` on the `subcontractor_payments` table. All the data in the column will be lost.
  - Added the required column `projectId` to the `subcontractor_payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "subcontractor_payments" DROP COLUMN "paymentDate",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "subcontractor_payments" ADD CONSTRAINT "subcontractor_payments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
