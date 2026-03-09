-- CreateTable
CREATE TABLE "restaurant_cache_city" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "restaurants" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "restaurantCount" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_cache_city_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_cache_city_city_key" ON "restaurant_cache_city"("city");

-- CreateIndex
CREATE INDEX "restaurant_cache_city_city_expiresAt_idx" ON "restaurant_cache_city"("city", "expiresAt");
