-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('HAVE', 'LOW', 'NEED');

-- CreateTable
CREATE TABLE "recurring_expenses" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "splitType" "SplitType" NOT NULL DEFAULT 'EQUAL',
    "paidById" TEXT NOT NULL,
    "notes" TEXT,
    "frequency" "RecurringFrequency" NOT NULL,
    "dayOfMonth" INTEGER,
    "dayOfWeek" INTEGER,
    "autoGenerate" BOOLEAN NOT NULL DEFAULT false,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "lastGeneratedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_notes" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER,
    "category" TEXT,
    "status" "InventoryStatus" NOT NULL DEFAULT 'HAVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_expenses_householdId_idx" ON "recurring_expenses"("householdId");

-- CreateIndex
CREATE INDEX "recurring_expenses_householdId_isActive_nextDueDate_idx" ON "recurring_expenses"("householdId", "isActive", "nextDueDate");

-- CreateIndex
CREATE INDEX "household_notes_householdId_idx" ON "household_notes"("householdId");

-- CreateIndex
CREATE INDEX "household_notes_householdId_isPinned_idx" ON "household_notes"("householdId", "isPinned");

-- CreateIndex
CREATE INDEX "inventory_items_householdId_idx" ON "inventory_items"("householdId");

-- CreateIndex
CREATE INDEX "inventory_items_householdId_status_idx" ON "inventory_items"("householdId", "status");

-- AddForeignKey
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_notes" ADD CONSTRAINT "household_notes_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_notes" ADD CONSTRAINT "household_notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
