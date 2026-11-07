-- AlterTable
ALTER TABLE "saved_carts" ADD COLUMN "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing carts were last priced when they were saved.
UPDATE "saved_carts" SET "refreshedAt" = "savedAt";
