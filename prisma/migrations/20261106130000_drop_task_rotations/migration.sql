-- Rollback (manual, if needed):
--   CREATE TABLE "task_rotations" (
--     "id" TEXT NOT NULL,
--     "taskId" TEXT NOT NULL,
--     "householdId" TEXT NOT NULL,
--     "frequency" "TaskFrequency" NOT NULL,
--     "isActive" BOOLEAN NOT NULL DEFAULT true,
--     "lastGenerated" TIMESTAMP(3),
--     "nextDueDate" TIMESTAMP(3),
--     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     "updatedAt" TIMESTAMP(3) NOT NULL,
--     CONSTRAINT "task_rotations_pkey" PRIMARY KEY ("id")
--   );
--   CREATE UNIQUE INDEX "task_rotations_taskId_key" ON "task_rotations"("taskId");
--   CREATE INDEX "task_rotations_householdId_isActive_idx" ON "task_rotations"("householdId", "isActive");
--   ALTER TABLE "task_rotations" ADD CONSTRAINT "task_rotations_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--   ALTER TABLE "task_rotations" ADD CONSTRAINT "task_rotations_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--   -- Row data is lost once dropped; re-derive from tasks.isRotating if ever needed.

-- DropForeignKey
ALTER TABLE "task_rotations" DROP CONSTRAINT "task_rotations_taskId_fkey";

-- DropForeignKey
ALTER TABLE "task_rotations" DROP CONSTRAINT "task_rotations_householdId_fkey";

-- DropTable
DROP TABLE "task_rotations";
