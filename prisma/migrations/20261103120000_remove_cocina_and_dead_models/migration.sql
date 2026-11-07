-- Remove rows using the COCINA enum value before narrowing the AiJobType enum,
-- since Postgres can't cast existing "COCINA" rows into the new enum.
DELETE FROM "ai_job_logs" WHERE "jobType" = 'COCINA';

-- AlterEnum
BEGIN;
CREATE TYPE "AiJobType_new" AS ENUM ('PREVIEW_PLAN', 'SHOPPING_PLAN');
ALTER TABLE "ai_job_logs" ALTER COLUMN "jobType" TYPE "AiJobType_new" USING ("jobType"::text::"AiJobType_new");
ALTER TYPE "AiJobType" RENAME TO "AiJobType_old";
ALTER TYPE "AiJobType_new" RENAME TO "AiJobType";
DROP TYPE "AiJobType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "whatsapp_links" DROP CONSTRAINT "whatsapp_links_memberId_fkey";

-- DropForeignKey
ALTER TABLE "price_cache" DROP CONSTRAINT "price_cache_householdId_fkey";

-- DropForeignKey
ALTER TABLE "saved_recipes" DROP CONSTRAINT "saved_recipes_memberId_fkey";

-- DropTable
DROP TABLE "whatsapp_links";

-- DropTable
DROP TABLE "price_cache";

-- DropTable
DROP TABLE "saved_recipes";
