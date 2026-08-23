-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL DEFAULT 'company-settings',
    "name" TEXT,
    "description" TEXT,
    "companyNumber" TEXT,
    "logo" TEXT,
    "signature" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);
