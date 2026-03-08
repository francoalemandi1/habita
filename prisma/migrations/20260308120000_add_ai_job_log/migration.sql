-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "AiJobType" AS ENUM ('PREVIEW_PLAN', 'COCINA', 'SHOPPING_PLAN');

-- CreateTable
CREATE TABLE "ai_job_logs" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "jobType" "AiJobType" NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'RUNNING',
    "inputData" JSONB,
    "resultData" JSONB,
    "weeklyPlanId" TEXT,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ai_job_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_job_logs_householdId_jobType_status_idx" ON "ai_job_logs"("householdId", "jobType", "status");

-- AddForeignKey
ALTER TABLE "ai_job_logs" ADD CONSTRAINT "ai_job_logs_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_job_logs" ADD CONSTRAINT "ai_job_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_job_logs" ADD CONSTRAINT "ai_job_logs_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "weekly_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
