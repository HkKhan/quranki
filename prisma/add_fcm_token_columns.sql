-- Add FCM token columns to NotificationSettings table
ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "pushNotifications" BOOLEAN DEFAULT false;
ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "fcmToken" TEXT;
ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "fcmTokenCreatedAt" TIMESTAMP; 