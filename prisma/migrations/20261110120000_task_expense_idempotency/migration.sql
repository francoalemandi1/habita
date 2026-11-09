-- Rollback: DROP INDEX "tasks_householdId_idempotencyKey_key"; DROP INDEX "expenses_householdId_idempotencyKey_key";
--           ALTER TABLE "tasks" DROP COLUMN "idempotencyKey"; ALTER TABLE "expenses" DROP COLUMN "idempotencyKey";

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tasks_householdId_idempotencyKey_key" ON "tasks"("householdId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_householdId_idempotencyKey_key" ON "expenses"("householdId", "idempotencyKey");
