import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { prisma } from '@/lib/prisma';

interface NotificationUpdateData {
  optedIn: boolean;
  pushNotifications: boolean;
  dailyReminders: boolean;
  weeklyReminders: boolean;
  streakReminders: boolean;
}

// Helper function to generate notification settings summary
function getNotificationSummary(settings: NotificationUpdateData): string {
  const enabledNotifications = [];
  if (settings.dailyReminders) enabledNotifications.push('Daily Reminders');
  if (settings.weeklyReminders) enabledNotifications.push('Weekly Summaries');
  if (settings.streakReminders) enabledNotifications.push('Streak Alerts');
  
  if (enabledNotifications.length === 0) {
    return 'No specific notification types selected.';
  }
  
  return enabledNotifications.join(', ');
}

// GET - Fetch notification settings
export async function GET() {
  try {
    const session = await auth();
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'You must be logged in to view notification settings' },
        { status: 401 }
      );
    }
    
    try {
      // Use raw query to get notification settings
      const result = await prisma.$queryRaw`
        SELECT 
          "optedIn", 
          "pushNotifications", 
          "dailyReminders", 
          "weeklyReminders", 
          "streakReminders" 
        FROM "NotificationSettings" 
        WHERE "userId" = ${session.user.id}
      `;
      
      // Check if we got any results
      const userSettings = Array.isArray(result) && result.length > 0 ? result[0] : null;
      
      // Return empty settings if none exist yet
      if (!userSettings) {
        return NextResponse.json({ 
          optedIn: false,
          pushNotifications: false,
          dailyReminders: false,
          weeklyReminders: false,
          streakReminders: false
        });
      }
      
      return NextResponse.json({ 
        optedIn: userSettings.optedIn,
        pushNotifications: userSettings.pushNotifications ?? false,
        dailyReminders: userSettings.dailyReminders ?? false,
        weeklyReminders: userSettings.weeklyReminders ?? false,
        streakReminders: userSettings.streakReminders ?? false
      });
    } catch (dbError) {
      console.error('Database error fetching notification settings:', dbError);
      return NextResponse.json(
        { 
          error: 'Database error fetching notification settings',
          optedIn: false,
          pushNotifications: false,
          dailyReminders: false,
          weeklyReminders: false,
          streakReminders: false
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch notification settings',
        optedIn: false,
        pushNotifications: false,
        dailyReminders: false,
        weeklyReminders: false,
        streakReminders: false
      },
      { status: 500 }
    );
  }
}

// POST - Update notification settings
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'You must be logged in to update notification settings' },
        { status: 401 }
      );
    }
    
    const data = await request.json();
    const { optedIn, pushNotifications, dailyReminders, weeklyReminders, streakReminders } = data;
    
    // Prepare data for upsert operation
    const updateData: NotificationUpdateData = {
      optedIn: optedIn ?? false,
      pushNotifications: pushNotifications ?? false,
      dailyReminders: dailyReminders ?? false,
      weeklyReminders: weeklyReminders ?? false,
      streakReminders: streakReminders ?? false
    };
    
    try {
      // Check if settings already exist for this user
      const existingSettings = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "NotificationSettings" WHERE "userId" = ${session.user.id}
      `;
      
      const hasExistingSettings = Array.isArray(existingSettings) && 
                                existingSettings.length > 0 && 
                                existingSettings[0].count > 0;
      
      if (hasExistingSettings) {
        // Update existing settings
        await prisma.$executeRaw`
          UPDATE "NotificationSettings"
          SET 
            "optedIn" = ${updateData.optedIn},
            "pushNotifications" = ${updateData.pushNotifications},
            "dailyReminders" = ${updateData.dailyReminders},
            "weeklyReminders" = ${updateData.weeklyReminders},
            "streakReminders" = ${updateData.streakReminders},
            "updatedAt" = NOW()
          WHERE "userId" = ${session.user.id}
        `;
      } else {
        // Create new settings
        await prisma.$executeRaw`
          INSERT INTO "NotificationSettings"
          ("id", "userId", "optedIn", "pushNotifications", "dailyReminders", "weeklyReminders", "streakReminders", "createdAt", "updatedAt")
          VALUES
          (gen_random_uuid(), ${session.user.id}, ${updateData.optedIn}, ${updateData.pushNotifications}, 
           ${updateData.dailyReminders}, ${updateData.weeklyReminders}, ${updateData.streakReminders},
           NOW(), NOW())
        `;
      }
      
      // Get the updated settings
      const updatedSettingsResult = await prisma.$queryRaw`
        SELECT 
          "optedIn", 
          "pushNotifications", 
          "dailyReminders", 
          "weeklyReminders", 
          "streakReminders" 
        FROM "NotificationSettings" 
        WHERE "userId" = ${session.user.id}
      `;
      
      // Use the updated settings if available, otherwise use the update data
      const updatedSettings = Array.isArray(updatedSettingsResult) && updatedSettingsResult.length > 0 
        ? updatedSettingsResult[0] 
        : updateData;
      
      return NextResponse.json({ 
        success: true,
        optedIn: updatedSettings.optedIn,
        pushNotifications: updatedSettings.pushNotifications,
        dailyReminders: updatedSettings.dailyReminders,
        weeklyReminders: updatedSettings.weeklyReminders,
        streakReminders: updatedSettings.streakReminders
      });
    } catch (dbError) {
      console.error('Database error updating notification settings:', dbError);
      return NextResponse.json(
        { error: 'Database error updating notification settings' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    );
  }
} 