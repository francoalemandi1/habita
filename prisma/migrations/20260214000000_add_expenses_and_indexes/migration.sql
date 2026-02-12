-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('GROCERIES', 'UTILITIES', 'RENT', 'FOOD', 'TRANSPORT', 'HEALTH', 'ENTERTAINMENT', 'EDUCATION', 'HOME', 'OTHER');

-- CreateEnum
CREATE TYPE "SplitType" AS ENUM ('EQUAL', 'CUSTOM', 'PERCENTAGE');

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "paidById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "splitType" "SplitType" NOT NULL DEFAULT 'EQUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_splits" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "settled" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "expense_splits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (expenses)
CREATE INDEX "expenses_householdId_idx" ON "expenses"("householdId");
CREATE INDEX "expenses_paidById_idx" ON "expenses"("paidById");
CREATE INDEX "expenses_householdId_date_idx" ON "expenses"("householdId", "date");

-- CreateIndex (expense_splits)
CREATE UNIQUE INDEX "expense_splits_expenseId_memberId_key" ON "expense_splits"("expenseId", "memberId");
CREATE INDEX "expense_splits_memberId_idx" ON "expense_splits"("memberId");
CREATE INDEX "expense_splits_memberId_settled_idx" ON "expense_splits"("memberId", "settled");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Performance indexes
CREATE INDEX "members_userId_idx" ON "members"("userId");
CREATE INDEX "tasks_householdId_isActive_idx" ON "tasks"("householdId", "isActive");
CREATE INDEX "weekly_plans_householdId_status_expiresAt_idx" ON "weekly_plans"("householdId", "status", "expiresAt");
