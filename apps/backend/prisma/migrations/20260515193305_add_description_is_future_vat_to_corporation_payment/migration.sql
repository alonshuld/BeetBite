-- AlterTable
ALTER TABLE "corporation_payments" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isFuture" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vatPercentage" DECIMAL(5,2);
