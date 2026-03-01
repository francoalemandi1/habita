-- AlterEnum
ALTER TYPE "IngestionStatus" ADD VALUE 'RUNNING';

-- AlterTable
ALTER TABLE "event_ingestion_logs" ADD COLUMN     "city" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "saved_events" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "culturalEventId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "venueName" TEXT,
    "address" TEXT,
    "priceRange" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "imageUrl" TEXT,
    "artists" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "culturalCategory" TEXT,
    "highlightReason" TEXT,
    "ticketUrl" TEXT,
    "bookingUrl" TEXT,
    "dateInfo" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_recipes" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "prepTimeMinutes" INTEGER NOT NULL,
    "servings" INTEGER NOT NULL,
    "ingredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missingIngredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "steps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tip" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_carts" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "searchTerms" TEXT[],
    "products" JSONB NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "cheapestCount" INTEGER NOT NULL DEFAULT 0,
    "missingTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalSearched" INTEGER NOT NULL DEFAULT 0,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_carts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_events_memberId_idx" ON "saved_events"("memberId");

-- CreateIndex
CREATE INDEX "saved_events_memberId_startDate_idx" ON "saved_events"("memberId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "saved_events_memberId_culturalEventId_key" ON "saved_events"("memberId", "culturalEventId");

-- CreateIndex
CREATE INDEX "saved_recipes_memberId_idx" ON "saved_recipes"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_recipes_memberId_contentHash_key" ON "saved_recipes"("memberId", "contentHash");

-- CreateIndex
CREATE INDEX "saved_carts_memberId_idx" ON "saved_carts"("memberId");

-- CreateIndex
CREATE INDEX "event_ingestion_logs_city_status_idx" ON "event_ingestion_logs"("city", "status");

-- AddForeignKey
ALTER TABLE "saved_events" ADD CONSTRAINT "saved_events_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_recipes" ADD CONSTRAINT "saved_recipes_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_carts" ADD CONSTRAINT "saved_carts_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
