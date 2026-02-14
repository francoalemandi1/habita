-- CreateTable
CREATE TABLE "price_cache" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "locationKey" TEXT NOT NULL,
    "planData" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_cache_householdId_locationKey_expiresAt_idx" ON "price_cache"("householdId", "locationKey", "expiresAt");

-- AddForeignKey
ALTER TABLE "price_cache" ADD CONSTRAINT "price_cache_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
