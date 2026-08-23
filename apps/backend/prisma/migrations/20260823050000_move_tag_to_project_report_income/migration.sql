-- The tag (e.g. "שלד", "גמר") labels a chunk of approved work, which is what an
-- income entry records. It was first added to subcontractor_payments, but a
-- payment is a different record with a different cardinality: a month's payout
-- is one combined figure, while a report can carry several tagged income
-- entries. Move the column to the record whose amount is being labelled.
ALTER TABLE "project_report_incomes" ADD COLUMN "tag" TEXT;

-- Best-effort backfill. Only reports whose payments agree on a single tag can
-- be carried over unambiguously; where a project/month carries several distinct
-- tags there is no way to tell which income entry each belonged to, so those
-- are left NULL for the operator to re-enter rather than guessed at.
UPDATE "project_report_incomes" AS pri
SET "tag" = sole."tag"
FROM "project_reports" AS pr
JOIN LATERAL (
  SELECT MIN(sp."tag") AS "tag"
  FROM "subcontractor_payments" AS sp
  WHERE sp."projectId" = pr."projectId"
    AND sp."serviceDate" = pr."date"
    AND sp."tag" IS NOT NULL
  HAVING COUNT(DISTINCT sp."tag") = 1
) AS sole ON TRUE
WHERE pri."projectReportId" = pr."id";

ALTER TABLE "subcontractor_payments" DROP COLUMN "tag";
