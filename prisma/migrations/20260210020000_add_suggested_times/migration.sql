-- AlterTable
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "suggestedStartTime" TEXT;
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "suggestedEndTime" TEXT;
