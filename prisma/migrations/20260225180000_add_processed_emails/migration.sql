-- CreateTable
CREATE TABLE "processed_emails" (
    "id" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceName" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "processed_emails_userId_idx" ON "processed_emails"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "processed_emails_gmailMessageId_userId_key" ON "processed_emails"("gmailMessageId", "userId");

-- AddForeignKey
ALTER TABLE "processed_emails" ADD CONSTRAINT "processed_emails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
