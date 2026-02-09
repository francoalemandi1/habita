-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TRANSFER_REQUEST', 'TRANSFER_ACCEPTED', 'TRANSFER_REJECTED', 'TASK_OVERDUE', 'ACHIEVEMENT_UNLOCKED', 'LEVEL_UP', 'PENALTY_APPLIED', 'REMINDER_DUE', 'PLAN_READY', 'PLAN_APPLIED', 'REWARD_REDEEMED', 'STREAK_MILESTONE');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_memberId_isRead_createdAt_idx" ON "notifications"("memberId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_memberId_createdAt_idx" ON "notifications"("memberId", "createdAt");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
