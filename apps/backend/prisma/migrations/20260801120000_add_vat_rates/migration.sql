-- CreateTable
CREATE TABLE "vat_rates" (
    "id" TEXT NOT NULL,
    "effectiveMonth" DATE NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vat_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vat_rates_effectiveMonth_key" ON "vat_rates"("effectiveMonth");
