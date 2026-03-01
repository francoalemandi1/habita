-- CreateTable
CREATE TABLE "bank_promos" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "promoargId" TEXT,
    "bankSlug" TEXT NOT NULL,
    "bankDisplayName" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "discountPercent" INTEGER NOT NULL,
    "daysOfWeek" TEXT NOT NULL,
    "paymentMethods" TEXT,
    "eligiblePlans" TEXT,
    "capAmount" INTEGER,
    "categories" TEXT,
    "validUntil" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_promos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_pipeline_logs" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "promosFound" INTEGER NOT NULL DEFAULT 0,
    "promosCreated" INTEGER NOT NULL DEFAULT 0,
    "promosUpdated" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "promo_pipeline_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_promos_householdId_idx" ON "bank_promos"("householdId");

-- CreateIndex
CREATE INDEX "bank_promos_householdId_storeName_idx" ON "bank_promos"("householdId", "storeName");

-- CreateIndex
CREATE INDEX "promo_pipeline_logs_householdId_status_idx" ON "promo_pipeline_logs"("householdId", "status");

-- AddForeignKey
ALTER TABLE "bank_promos" ADD CONSTRAINT "bank_promos_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_pipeline_logs" ADD CONSTRAINT "promo_pipeline_logs_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
