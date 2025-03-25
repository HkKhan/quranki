-- Add hasSeenPrompt column to NotificationSettings table
ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "hasSeenPrompt" BOOLEAN DEFAULT false; 