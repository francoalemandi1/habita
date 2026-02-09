-- CreateIndex
CREATE INDEX "assignments_taskId_status_idx" ON "assignments"("taskId", "status");

-- CreateIndex
CREATE INDEX "assignments_householdId_status_completedAt_idx" ON "assignments"("householdId", "status", "completedAt");

-- CreateIndex
CREATE INDEX "assignments_memberId_status_completedAt_idx" ON "assignments"("memberId", "status", "completedAt");

-- AddForeignKey
ALTER TABLE "household_rewards" ADD CONSTRAINT "household_rewards_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
