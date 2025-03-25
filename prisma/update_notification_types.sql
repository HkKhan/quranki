-- Add new columns for multiple notification types
ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "dailyReminders" BOOLEAN DEFAULT false;
ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "weeklyReminders" BOOLEAN DEFAULT false;
ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "streakReminders" BOOLEAN DEFAULT false;

-- Migrate existing data based on reminderFrequency
UPDATE "NotificationSettings" 
SET "dailyReminders" = true
WHERE "reminderFrequency" = 'daily';

UPDATE "NotificationSettings" 
SET "weeklyReminders" = true
WHERE "reminderFrequency" = 'weekly';

UPDATE "NotificationSettings" 
SET "streakReminders" = true
WHERE "reminderFrequency" = 'streak-only';

-- Drop old column after data migration
ALTER TABLE "NotificationSettings" DROP COLUMN IF EXISTS "reminderFrequency"; 