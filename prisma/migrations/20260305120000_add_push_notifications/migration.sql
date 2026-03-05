-- AlterEnum: add new NotificationType values
ALTER TYPE "NotificationType" ADD VALUE 'EXPENSE_SHARED';
ALTER TYPE "NotificationType" ADD VALUE 'MEMBER_JOINED';
ALTER TYPE "NotificationType" ADD VALUE 'CULTURAL_RECOMMENDATION';
ALTER TYPE "NotificationType" ADD VALUE 'DEAL_ALERT';

-- CreateTable: expo_push_tokens
CREATE TABLE "expo_push_tokens" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'ios',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expo_push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notification_preferences
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable: push_delivery_logs
CREATE TABLE "push_delivery_logs" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expoTicketId" TEXT,

    CONSTRAINT "push_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expo_push_tokens_token_key" ON "expo_push_tokens"("token");

-- CreateIndex
CREATE INDEX "expo_push_tokens_memberId_idx" ON "expo_push_tokens"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "expo_push_tokens_memberId_deviceId_key" ON "expo_push_tokens"("memberId", "deviceId");

-- CreateIndex
CREATE INDEX "notification_preferences_memberId_idx" ON "notification_preferences"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_memberId_category_key" ON "notification_preferences"("memberId", "category");

-- CreateIndex
CREATE INDEX "push_delivery_logs_memberId_sentAt_idx" ON "push_delivery_logs"("memberId", "sentAt");

-- CreateIndex
CREATE INDEX "push_delivery_logs_memberId_type_sentAt_idx" ON "push_delivery_logs"("memberId", "type", "sentAt");

-- AddForeignKey
ALTER TABLE "expo_push_tokens" ADD CONSTRAINT "expo_push_tokens_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_delivery_logs" ADD CONSTRAINT "push_delivery_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
