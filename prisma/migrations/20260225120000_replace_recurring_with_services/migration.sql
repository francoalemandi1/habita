-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('CINE', 'TEATRO', 'MUSICA', 'EXPOSICIONES', 'FESTIVALES', 'MERCADOS', 'PASEOS', 'EXCURSIONES', 'TALLERES', 'DANZA', 'LITERATURA', 'GASTRONOMIA', 'DEPORTES', 'INFANTIL', 'OTRO');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PAST');

-- CreateEnum
CREATE TYPE "EventSourceType" AS ENUM ('API', 'SCRAPER', 'WEB_DISCOVERY', 'AGENDA', 'VENUE');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

-- DropForeignKey
ALTER TABLE "recurring_expenses" DROP CONSTRAINT "recurring_expenses_householdId_fkey";

-- DropForeignKey
ALTER TABLE "recurring_expenses" DROP CONSTRAINT "recurring_expenses_paidById_fkey";

-- AlterTable
ALTER TABLE "assignments" DROP COLUMN "pointsEarned",
DROP COLUMN "suggestedEndTime",
DROP COLUMN "suggestedStartTime";

-- AlterTable
ALTER TABLE "members" DROP COLUMN "availabilitySlots",
DROP COLUMN "occupation_level",
ADD COLUMN     "occupationLevel" "OccupationLevel" NOT NULL DEFAULT 'MODERATE';

-- DropTable
DROP TABLE "recurring_expenses";

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT,
    "accountNumber" TEXT,
    "lastAmount" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "splitType" "SplitType" NOT NULL DEFAULT 'EQUAL',
    "paidById" TEXT NOT NULL,
    "notes" TEXT,
    "frequency" "RecurringFrequency" NOT NULL,
    "dayOfMonth" INTEGER,
    "dayOfWeek" INTEGER,
    "autoGenerate" BOOLEAN NOT NULL DEFAULT false,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "lastGeneratedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "pdfUrl" TEXT,
    "expenseId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cultural_cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "population" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cultural_cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cultural_venues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cityId" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "website" TEXT,
    "phone" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cultural_venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_sources" (
    "id" TEXT NOT NULL,
    "type" "EventSourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "reliabilityScore" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastFetchedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cultural_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "venueName" TEXT,
    "venueId" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "cityId" TEXT,
    "province" TEXT,
    "category" "EventCategory" NOT NULL DEFAULT 'OTRO',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "artists" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priceMin" DOUBLE PRECISION,
    "priceMax" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'ARS',
    "sourceId" TEXT,
    "sourceUrl" TEXT,
    "sourceEventId" TEXT,
    "imageUrl" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'ACTIVE',
    "searchVector" tsvector,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cultural_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_ingestion_logs" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "IngestionStatus" NOT NULL,
    "eventsFound" INTEGER NOT NULL DEFAULT 0,
    "eventsCreated" INTEGER NOT NULL DEFAULT 0,
    "eventsUpdated" INTEGER NOT NULL DEFAULT 0,
    "eventsDuplicate" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_ingestion_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "services_householdId_idx" ON "services"("householdId");

-- CreateIndex
CREATE INDEX "services_householdId_isActive_nextDueDate_idx" ON "services"("householdId", "isActive", "nextDueDate");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_expenseId_key" ON "invoices"("expenseId");

-- CreateIndex
CREATE INDEX "invoices_serviceId_idx" ON "invoices"("serviceId");

-- CreateIndex
CREATE INDEX "invoices_householdId_status_idx" ON "invoices"("householdId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_serviceId_period_key" ON "invoices"("serviceId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "cultural_cities_name_province_key" ON "cultural_cities"("name", "province");

-- CreateIndex
CREATE UNIQUE INDEX "cultural_venues_slug_key" ON "cultural_venues"("slug");

-- CreateIndex
CREATE INDEX "cultural_venues_cityId_idx" ON "cultural_venues"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "event_sources_name_key" ON "event_sources"("name");

-- CreateIndex
CREATE INDEX "event_sources_type_isActive_idx" ON "event_sources"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "cultural_events_slug_key" ON "cultural_events"("slug");

-- CreateIndex
CREATE INDEX "cultural_events_cityId_category_startDate_idx" ON "cultural_events"("cityId", "category", "startDate");

-- CreateIndex
CREATE INDEX "cultural_events_startDate_status_idx" ON "cultural_events"("startDate", "status");

-- CreateIndex
CREATE INDEX "cultural_events_sourceId_sourceEventId_idx" ON "cultural_events"("sourceId", "sourceEventId");

-- CreateIndex
CREATE INDEX "cultural_events_status_startDate_idx" ON "cultural_events"("status", "startDate");

-- CreateIndex
CREATE INDEX "event_ingestion_logs_sourceId_createdAt_idx" ON "event_ingestion_logs"("sourceId", "createdAt");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cultural_venues" ADD CONSTRAINT "cultural_venues_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cultural_cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cultural_events" ADD CONSTRAINT "cultural_events_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "cultural_venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cultural_events" ADD CONSTRAINT "cultural_events_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cultural_cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cultural_events" ADD CONSTRAINT "cultural_events_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "event_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_ingestion_logs" ADD CONSTRAINT "event_ingestion_logs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "event_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

