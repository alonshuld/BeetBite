-- AlterTable
-- requesterName and location are required going forward, but there is no data
-- to backfill existing rows with, so add them with a temporary default and
-- drop the default immediately after so new rows are forced to supply a value.
ALTER TABLE "projects" ADD COLUMN     "requesterName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "projects" ADD COLUMN     "location" TEXT NOT NULL DEFAULT '';

ALTER TABLE "projects" ALTER COLUMN "requesterName" DROP DEFAULT;
ALTER TABLE "projects" ALTER COLUMN "location" DROP DEFAULT;
