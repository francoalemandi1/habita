-- Rollback (manual, if needed):
--   ALTER TABLE "members" DROP COLUMN "quietHoursStart";
--   ALTER TABLE "members" DROP COLUMN "quietHoursEnd";
--   ALTER TABLE "members" DROP COLUMN "availability";

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "availability" JSONB,
ADD COLUMN     "quietHoursEnd" INTEGER,
ADD COLUMN     "quietHoursStart" INTEGER;
