-- CreateTable
CREATE TABLE "plan_feedbacks" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_feedbacks_householdId_idx" ON "plan_feedbacks"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_feedbacks_planId_memberId_key" ON "plan_feedbacks"("planId", "memberId");

-- AddForeignKey
ALTER TABLE "plan_feedbacks" ADD CONSTRAINT "plan_feedbacks_planId_fkey" FOREIGN KEY ("planId") REFERENCES "weekly_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_feedbacks" ADD CONSTRAINT "plan_feedbacks_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_feedbacks" ADD CONSTRAINT "plan_feedbacks_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
