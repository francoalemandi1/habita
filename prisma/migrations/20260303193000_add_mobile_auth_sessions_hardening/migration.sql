-- CreateEnum
CREATE TYPE "MobileAuthTokenKind" AS ENUM ('ACCESS', 'REFRESH');

-- CreateTable
CREATE TABLE "mobile_auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenKind" "MobileAuthTokenKind" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenFamilyId" TEXT NOT NULL,
    "deviceId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "rotatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,

    CONSTRAINT "mobile_auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mobile_auth_sessions_tokenHash_key" ON "mobile_auth_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "mobile_auth_sessions_userId_tokenKind_idx" ON "mobile_auth_sessions"("userId", "tokenKind");

-- CreateIndex
CREATE INDEX "mobile_auth_sessions_tokenFamilyId_tokenKind_idx" ON "mobile_auth_sessions"("tokenFamilyId", "tokenKind");

-- CreateIndex
CREATE INDEX "mobile_auth_sessions_expiresAt_idx" ON "mobile_auth_sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "mobile_auth_sessions" ADD CONSTRAINT "mobile_auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_auth_sessions" ADD CONSTRAINT "mobile_auth_sessions_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "mobile_auth_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
