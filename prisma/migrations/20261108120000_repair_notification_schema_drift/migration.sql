-- Repair drift: production recorded 20260305120000_add_push_notifications as
-- applied, but its objects never existed there, and several NotificationType
-- values and indexes were added to the schema without a migration.
-- Every statement is idempotent so databases that already have them are unaffected.

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SERVICE_DUE_SOON';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EXPENSE_WEEKLY_SUMMARY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EXPENSE_SHARED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MEMBER_JOINED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CULTURAL_RECOMMENDATION';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DEAL_ALERT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DAILY_BRIEFING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SPENDING_ALERT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'EXPENSE_REMINDER';

-- CreateTable
CREATE TABLE IF NOT EXISTS "expo_push_tokens" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'ios',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expo_push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "notification_preferences" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "push_delivery_logs" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expoTicketId" TEXT,

    CONSTRAINT "push_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "expo_push_tokens_token_key" ON "expo_push_tokens"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "expo_push_tokens_memberId_idx" ON "expo_push_tokens"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "expo_push_tokens_memberId_deviceId_key" ON "expo_push_tokens"("memberId", "deviceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notification_preferences_memberId_idx" ON "notification_preferences"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_memberId_category_key" ON "notification_preferences"("memberId", "category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "push_delivery_logs_memberId_sentAt_idx" ON "push_delivery_logs"("memberId", "sentAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "push_delivery_logs_memberId_type_sentAt_idx" ON "push_delivery_logs"("memberId", "type", "sentAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "saved_carts_householdId_idx" ON "saved_carts"("householdId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "saved_events_householdId_idx" ON "saved_events"("householdId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expo_push_tokens_memberId_fkey') THEN
    ALTER TABLE "expo_push_tokens" ADD CONSTRAINT "expo_push_tokens_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_memberId_fkey') THEN
    ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'push_delivery_logs_memberId_fkey') THEN
    ALTER TABLE "push_delivery_logs" ADD CONSTRAINT "push_delivery_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

