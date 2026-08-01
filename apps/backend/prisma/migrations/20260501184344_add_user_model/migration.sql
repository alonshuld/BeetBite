-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "estimatedAmount" DECIMAL(12,2) NOT NULL,
    "finishDate" DATE NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "subcontractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "corporations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_reports" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "profitMargin" DECIMAL(5,2) NOT NULL,
    "income" DECIMAL(12,2) NOT NULL,
    "incomeDate" DATE,

    CONSTRAINT "project_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporation_payments" (
    "id" TEXT NOT NULL,
    "projectReportId" TEXT NOT NULL,
    "corporationId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "corporation_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractor_payments" (
    "id" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "serviceDate" DATE NOT NULL,
    "paymentDate" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "subcontractor_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_name_key" ON "clients"("name");

-- CreateIndex
CREATE UNIQUE INDEX "projects_name_key" ON "projects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subcontractors_name_key" ON "subcontractors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "corporations_name_key" ON "corporations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "project_reports_projectId_date_key" ON "project_reports"("projectId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_reports" ADD CONSTRAINT "project_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_reports" ADD CONSTRAINT "project_reports_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "subcontractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporation_payments" ADD CONSTRAINT "corporation_payments_projectReportId_fkey" FOREIGN KEY ("projectReportId") REFERENCES "project_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporation_payments" ADD CONSTRAINT "corporation_payments_corporationId_fkey" FOREIGN KEY ("corporationId") REFERENCES "corporations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_payments" ADD CONSTRAINT "subcontractor_payments_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "subcontractors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
