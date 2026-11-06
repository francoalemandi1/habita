-- Rollback (manual, if needed):
--   Postgres can't drop a single enum value; recreate the enum without it if ever needed.

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MEMBER_LEFT';
