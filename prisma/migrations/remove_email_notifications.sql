-- Drop email notifications column from NotificationSettings table
ALTER TABLE "NotificationSettings" DROP COLUMN IF EXISTS "emailNotifications";

-- Set all push notification settings to true by default
UPDATE "NotificationSettings" SET "pushNotifications" = true WHERE "pushNotifications" = false;

-- Set the default for pushNotifications to true for new records
ALTER TABLE "NotificationSettings" ALTER COLUMN "pushNotifications" SET DEFAULT true;

-- Set user reminders preferences to default true if they were null
UPDATE "NotificationSettings" SET "dailyReminders" = true WHERE "dailyReminders" = false;
UPDATE "NotificationSettings" SET "weeklyReminders" = true WHERE "weeklyReminders" = false;
UPDATE "NotificationSettings" SET "streakReminders" = true WHERE "streakReminders" = false;
UPDATE "NotificationSettings" SET "optedIn" = true WHERE "optedIn" = false; 