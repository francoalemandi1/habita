-- CreateTable
CREATE TABLE "shared_funds" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Fondo Común',
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "monthlyTarget" DECIMAL(10,2),
    "fundCategories" TEXT[] DEFAULT ARRAY['RENT', 'UTILITIES', 'GROCERIES', 'HOME']::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shared_funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_allocations" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "fund_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_contributions" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "period" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_expenses" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "expenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shared_funds_householdId_key" ON "shared_funds"("householdId");

-- CreateIndex
CREATE INDEX "fund_allocations_fundId_idx" ON "fund_allocations"("fundId");

-- CreateIndex
CREATE UNIQUE INDEX "fund_allocations_fundId_memberId_key" ON "fund_allocations"("fundId", "memberId");

-- CreateIndex
CREATE INDEX "fund_contributions_fundId_idx" ON "fund_contributions"("fundId");

-- CreateIndex
CREATE INDEX "fund_contributions_fundId_period_idx" ON "fund_contributions"("fundId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "fund_expenses_expenseId_key" ON "fund_expenses"("expenseId");

-- CreateIndex
CREATE INDEX "fund_expenses_fundId_idx" ON "fund_expenses"("fundId");

-- CreateIndex
CREATE INDEX "fund_expenses_fundId_date_idx" ON "fund_expenses"("fundId", "date");

-- AddForeignKey
ALTER TABLE "shared_funds" ADD CONSTRAINT "shared_funds_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "shared_funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_contributions" ADD CONSTRAINT "fund_contributions_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "shared_funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_contributions" ADD CONSTRAINT "fund_contributions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_expenses" ADD CONSTRAINT "fund_expenses_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "shared_funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_expenses" ADD CONSTRAINT "fund_expenses_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
