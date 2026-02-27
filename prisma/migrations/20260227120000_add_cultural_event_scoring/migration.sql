-- AlterTable
ALTER TABLE "cultural_events" ADD COLUMN     "bookingUrl" TEXT,
ADD COLUMN     "culturalCategory" TEXT,
ADD COLUMN     "culturalScore" DOUBLE PRECISION,
ADD COLUMN     "editorialHighlight" TEXT,
ADD COLUMN     "finalScore" DOUBLE PRECISION,
ADD COLUMN     "mapsUrl" TEXT,
ADD COLUMN     "originalityScore" DOUBLE PRECISION,
ADD COLUMN     "ticketUrl" TEXT;

-- CreateIndex
CREATE INDEX "cultural_events_cityId_status_finalScore_idx" ON "cultural_events"("cityId", "status", "finalScore");
