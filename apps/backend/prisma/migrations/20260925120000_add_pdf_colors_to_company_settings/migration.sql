-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN     "pdfPrimaryColor" TEXT NOT NULL DEFAULT '#1f2a44',
ADD COLUMN     "pdfSecondaryColor" TEXT NOT NULL DEFAULT '#c9a24b';
