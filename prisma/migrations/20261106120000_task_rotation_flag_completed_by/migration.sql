-- Rollback (manual, if needed before 20261106130000 is applied):
--   ALTER TABLE "assignments" DROP CONSTRAINT "assignments_completedByMemberId_fkey";
--   DROP INDEX "assignments_completedByMemberId_status_completedAt_idx";
--   ALTER TABLE "assignments" DROP COLUMN "completedByMemberId";
--   ALTER TABLE "tasks" DROP COLUMN "isRotating";
--   -- NotificationType enum value additions cannot be dropped in Postgres;
--   -- leaving 'TASK_COMPLETED_BY_OTHER' unused is safe.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TASK_COMPLETED_BY_OTHER';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "isRotating" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "completedByMemberId" TEXT;

-- CreateIndex
CREATE INDEX "assignments_completedByMemberId_status_completedAt_idx" ON "assignments"("completedByMemberId", "status", "completedAt");

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_completedByMemberId_fkey" FOREIGN KEY ("completedByMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: credit the assignee as the completer for existing completed/verified assignments.
UPDATE "assignments" SET "completedByMemberId" = "memberId" WHERE "status" IN ('COMPLETED', 'VERIFIED') AND "completedByMemberId" IS NULL;

-- Backfill: mark tasks that currently have an active rotation as rotating.
UPDATE "tasks" SET "isRotating" = true FROM "task_rotations" WHERE "task_rotations"."taskId" = "tasks"."id" AND "task_rotations"."isActive";
