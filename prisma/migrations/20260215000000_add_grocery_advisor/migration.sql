-- CreateEnum
CREATE TYPE "GroceryCategory" AS ENUM ('ALMACEN', 'PANADERIA_DULCES', 'LACTEOS', 'CARNES', 'FRUTAS_VERDURAS', 'BEBIDAS', 'LIMPIEZA', 'PERFUMERIA');

-- CreateTable
CREATE TABLE "product_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "searchTerms" TEXT NOT NULL DEFAULT '',
    "category" "GroceryCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEssential" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_cache" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "locationKey" TEXT NOT NULL,
    "category" "GroceryCategory" NOT NULL,
    "deals" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_product_exclusions" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_product_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_catalog_name_key" ON "product_catalog"("name");

-- CreateIndex
CREATE INDEX "product_catalog_category_isActive_idx" ON "product_catalog"("category", "isActive");

-- CreateIndex
CREATE INDEX "deal_cache_householdId_locationKey_category_expiresAt_idx" ON "deal_cache"("householdId", "locationKey", "category", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "household_product_exclusions_householdId_productName_key" ON "household_product_exclusions"("householdId", "productName");

-- CreateIndex
CREATE INDEX "household_product_exclusions_householdId_idx" ON "household_product_exclusions"("householdId");

-- AddForeignKey
ALTER TABLE "deal_cache" ADD CONSTRAINT "deal_cache_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_product_exclusions" ADD CONSTRAINT "household_product_exclusions_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
