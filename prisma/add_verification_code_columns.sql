-- Add verification code columns to NotificationSettings if they don't exist
DO $$
BEGIN
    -- Check if verificationCode column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'NotificationSettings'
        AND column_name = 'verificationCode'
    ) THEN
        -- Add verificationCode column
        ALTER TABLE "NotificationSettings" ADD COLUMN "verificationCode" TEXT;
    END IF;

    -- Check if verificationCodeExpires column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'NotificationSettings'
        AND column_name = 'verificationCodeExpires'
    ) THEN
        -- Add verificationCodeExpires column
        ALTER TABLE "NotificationSettings" ADD COLUMN "verificationCodeExpires" TIMESTAMP;
    END IF;
END $$; 