-- Rollback (manual):
--   DROP TABLE "mcp_oauth_tokens";
--   DROP TABLE "mcp_oauth_codes";
--   DROP TABLE "mcp_oauth_clients";
--   DROP TYPE "McpOAuthTokenKind";

-- CreateEnum
CREATE TYPE "McpOAuthTokenKind" AS ENUM ('ACCESS', 'REFRESH');

-- CreateTable
CREATE TABLE "mcp_oauth_clients" (
    "id" TEXT NOT NULL,
    "clientName" TEXT,
    "redirectUris" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "mcp_oauth_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_oauth_codes" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_oauth_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_oauth_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "kind" "McpOAuthTokenKind" NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "rotatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "mcp_oauth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mcp_oauth_codes_codeHash_key" ON "mcp_oauth_codes"("codeHash");

-- CreateIndex
CREATE INDEX "mcp_oauth_codes_userId_idx" ON "mcp_oauth_codes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "mcp_oauth_tokens_tokenHash_key" ON "mcp_oauth_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "mcp_oauth_tokens_familyId_idx" ON "mcp_oauth_tokens"("familyId");

-- CreateIndex
CREATE INDEX "mcp_oauth_tokens_userId_idx" ON "mcp_oauth_tokens"("userId");

-- AddForeignKey
ALTER TABLE "mcp_oauth_codes" ADD CONSTRAINT "mcp_oauth_codes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "mcp_oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_oauth_codes" ADD CONSTRAINT "mcp_oauth_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_oauth_tokens" ADD CONSTRAINT "mcp_oauth_tokens_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "mcp_oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_oauth_tokens" ADD CONSTRAINT "mcp_oauth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
