-- AlterTable
ALTER TABLE "ai_job_logs" ADD COLUMN     "lockKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ai_job_logs_lockKey_key" ON "ai_job_logs"("lockKey");
