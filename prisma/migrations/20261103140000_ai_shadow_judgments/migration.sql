-- CreateTable
CREATE TABLE "ai_shadow_judgments" (
    "id" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "subject" JSONB NOT NULL,
    "primary" JSONB NOT NULL,
    "shadow" JSONB NOT NULL,
    "shadowModel" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "inputTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_shadow_judgments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_shadow_judgments_task_createdAt_idx" ON "ai_shadow_judgments"("task", "createdAt");
