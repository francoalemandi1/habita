-- CreateTable
CREATE TABLE "deal_cache_city" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "category" "GroceryCategory" NOT NULL,
    "deals" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_cache_city_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deal_cache_city_city_category_key" ON "deal_cache_city"("city", "category");

-- CreateIndex
CREATE INDEX "deal_cache_city_city_category_expiresAt_idx" ON "deal_cache_city"("city", "category", "expiresAt");
