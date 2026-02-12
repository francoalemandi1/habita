-- CreateIndex
CREATE INDEX "assignments_memberId_dueDate_status_idx" ON "assignments"("memberId", "dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "task_catalog_name_key" ON "task_catalog"("name");
