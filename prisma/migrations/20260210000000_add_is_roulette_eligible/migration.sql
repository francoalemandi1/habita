-- AlterTable
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "isRouletteEligible" BOOLEAN NOT NULL DEFAULT false;
