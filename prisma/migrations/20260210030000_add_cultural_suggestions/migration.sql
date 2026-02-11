-- CreateTable
CREATE TABLE "cultural_suggestions" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "locationKey" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL DEFAULT 'culture',
    "suggestions" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cultural_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cultural_suggestions_householdId_locationKey_sectionType_ex_idx" ON "cultural_suggestions"("householdId", "locationKey", "sectionType", "expiresAt");

-- AddForeignKey
ALTER TABLE "cultural_suggestions" ADD CONSTRAINT "cultural_suggestions_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
