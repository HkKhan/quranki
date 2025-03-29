-- Add new columns
ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "emailNotifications" BOOLEAN DEFAULT true;
ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "reminderFrequency" VARCHAR(255) DEFAULT 'daily';

-- If you want to migrate data, do it here
-- For example, if users have opted in with phone but we want to keep them opted in for email
UPDATE "NotificationSettings" 
SET "emailNotifications" = true
WHERE "optedIn" = true;

-- Drop old columns (only after data migration if needed)
ALTER TABLE "NotificationSettings" DROP COLUMN IF EXISTS "phoneNumber";
ALTER TABLE "NotificationSettings" DROP COLUMN IF EXISTS "mobileCarrier";
ALTER TABLE "NotificationSettings" DROP COLUMN IF EXISTS "verifiedPhone";
ALTER TABLE "NotificationSettings" DROP COLUMN IF EXISTS "verificationCode";
ALTER TABLE "NotificationSettings" DROP COLUMN IF EXISTS "verificationCodeExpires"; 