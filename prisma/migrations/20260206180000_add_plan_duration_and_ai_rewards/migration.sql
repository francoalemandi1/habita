-- AlterTable: weekly_plans - add durationDays and excludedTasks
ALTER TABLE "weekly_plans" ADD COLUMN "durationDays" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "weekly_plans" ADD COLUMN "excludedTasks" JSONB;

-- AlterTable: household_rewards - add AI reward fields
ALTER TABLE "household_rewards" ADD COLUMN "isAiGenerated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "household_rewards" ADD COLUMN "planId" TEXT;
ALTER TABLE "household_rewards" ADD COLUMN "memberId" TEXT;
ALTER TABLE "household_rewards" ADD COLUMN "completionRate" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "household_rewards_planId_idx" ON "household_rewards"("planId");
