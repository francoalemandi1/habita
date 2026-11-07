-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "fromMemberId" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "note" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "settlements_householdId_settledAt_idx" ON "settlements"("householdId", "settledAt");

-- CreateIndex
CREATE INDEX "settlements_householdId_fromMemberId_idx" ON "settlements"("householdId", "fromMemberId");

-- CreateIndex
CREATE INDEX "settlements_householdId_toMemberId_idx" ON "settlements"("householdId", "toMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_householdId_idempotencyKey_key" ON "settlements"("householdId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: today's balance model is Σ unsettled ExpenseSplit rows. The new
-- ledger model is Σ all splits − Σ settlements, per currency. To preserve
-- today's balances exactly, every already-settled non-payer split (settled =
-- true, split.memberId <> expense.paidById) must become one settlement row
-- recording that the split's member paid the expense's payer.
--
-- Splits are grouped by (debtor member, payer member, currency, household)
-- so that settle-all / settle-between calls — which write one settledAt per
-- call across many splits — collapse back into one settlement row per group,
-- matching how they were actually recorded in prod. amount is the SUM of the
-- grouped splits; settledAt falls back to the expense's updatedAt when the
-- split itself has no settledAt (older rows written before that column
-- existed).
--
-- The id is derived deterministically from the group key (household, debtor,
-- payer, currency, settledAt) via md5, so re-running this backfill skips groups
-- already inserted (ON CONFLICT DO NOTHING) instead of duplicating them.
--
-- After this backfill: for every household and currency,
--   Σ ExpenseSplit.amount (all splits) − Σ Settlement.amount
--   = Σ ExpenseSplit.amount WHERE settled = false (the old balance).
-- This holds because every settled non-payer split is now covered by exactly
-- one settlement row of equal amount, and payer-side splits (memberId =
-- paidById) never contributed to the old balance either.
INSERT INTO "settlements" (
    "id",
    "householdId",
    "fromMemberId",
    "toMemberId",
    "amount",
    "currency",
    "settledAt",
    "createdById",
    "note",
    "createdAt"
)
SELECT
    'stl_' || md5(
        e."householdId" || ':' || es."memberId" || ':' || e."paidById" || ':' ||
        e."currency" || ':' || COALESCE(es."settledAt", e."updatedAt")::text
    ),
    e."householdId",
    es."memberId" AS "fromMemberId",
    e."paidById" AS "toMemberId",
    SUM(es."amount") AS "amount",
    e."currency",
    COALESCE(es."settledAt", e."updatedAt") AS "settledAt",
    es."memberId" AS "createdById",
    'Migrado desde liquidaciones anteriores' AS "note",
    COALESCE(es."settledAt", e."updatedAt") AS "createdAt"
FROM "expense_splits" es
JOIN "expenses" e ON e."id" = es."expenseId"
WHERE es."settled" = true
  AND es."memberId" <> e."paidById"
GROUP BY
    e."householdId",
    es."memberId",
    e."paidById",
    e."currency",
    COALESCE(es."settledAt", e."updatedAt")
ON CONFLICT ("id") DO NOTHING;
