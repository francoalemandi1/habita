-- Remove scheduling columns from assignments
ALTER TABLE "assignments" DROP COLUMN IF EXISTS "suggested_start_time";
ALTER TABLE "assignments" DROP COLUMN IF EXISTS "suggested_end_time";
ALTER TABLE "assignments" DROP COLUMN IF EXISTS "points_earned";

-- Remove availability from members, add occupation level
ALTER TABLE "members" DROP COLUMN IF EXISTS "availability_slots";

CREATE TYPE "OccupationLevel" AS ENUM ('BUSY', 'MODERATE', 'AVAILABLE');
ALTER TABLE "members" ADD COLUMN "occupation_level" "OccupationLevel" NOT NULL DEFAULT 'MODERATE';

-- Drop gamification tables (order matters for FK constraints)
DROP TABLE IF EXISTS "competition_scores" CASCADE;
DROP TABLE IF EXISTS "competitions" CASCADE;
DROP TABLE IF EXISTS "reward_redemptions" CASCADE;
DROP TABLE IF EXISTS "household_rewards" CASCADE;
DROP TABLE IF EXISTS "member_achievements" CASCADE;
DROP TABLE IF EXISTS "achievements" CASCADE;
DROP TABLE IF EXISTS "member_levels" CASCADE;
DROP TABLE IF EXISTS "task_reminders" CASCADE;

-- Drop unused enums
DROP TYPE IF EXISTS "CompetitionDuration";
DROP TYPE IF EXISTS "CompetitionStatus";
DROP TYPE IF EXISTS "ReminderType";
