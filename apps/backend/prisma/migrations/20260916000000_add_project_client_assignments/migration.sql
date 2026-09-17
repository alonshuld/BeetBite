-- CreateTable
CREATE TABLE "project_client_assignments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,

    CONSTRAINT "project_client_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_client_assignments_projectId_effectiveFrom_idx" ON "project_client_assignments"("projectId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "project_client_assignments_projectId_effectiveFrom_key" ON "project_client_assignments"("projectId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "project_client_assignments" ADD CONSTRAINT "project_client_assignments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_client_assignments" ADD CONSTRAINT "project_client_assignments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- MigrateData: every existing project gets an initial assignment to its current
-- client. effectiveFrom is that project's earliest report date so the whole of
-- its existing history resolves to the client it already had; projects with no
-- reports get a safely early date. Every project MUST end up with at least one
-- assignment — a project resolving to nothing would vanish from the UI.
INSERT INTO "project_client_assignments" ("id", "projectId", "clientId", "effectiveFrom")
SELECT
    gen_random_uuid()::text,
    p."id",
    p."clientId",
    COALESCE(
        (SELECT MIN(r."date") FROM "project_reports" r WHERE r."projectId" = p."id"),
        DATE '1970-01-01'
    )
FROM "projects" p;
