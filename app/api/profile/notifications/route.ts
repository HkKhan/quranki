import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { prisma } from '@/lib/prisma';

interface NotificationUpdateData {
  optedIn: boolean;
  pushNotifications: boolean;
  dailyReminders: boolean;
  weeklyReminders: boolean;
  streakReminders: boolean;
  hasSeenPrompt?: boolean;
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
      // Use raw query to avoid Prisma client issues with the schema
      const userSettings = await prisma.$queryRaw`
        SELECT 
          "optedIn", 
          "pushNotifications", 
          "dailyReminders", 
          "weeklyReminders", 
          "streakReminders",
          "hasSeenPrompt"
        FROM "NotificationSettings" 
        WHERE "userId" = ${session.user.id}
      `;
      
      // Convert result to array if it's not already
      const settingsArray = Array.isArray(userSettings) ? userSettings : [userSettings];
      
      // Return empty settings if none exist yet
      if (!settingsArray.length) {
        return NextResponse.json({ 
          optedIn: false,
          pushNotifications: false,
          dailyReminders: false,
          weeklyReminders: false,
          streakReminders: false,
          hasSeenPrompt: false
        });
      }
      
      const settings = settingsArray[0];
      
      return NextResponse.json({
        optedIn: !!settings.optedIn,
        pushNotifications: !!settings.pushNotifications,
        dailyReminders: !!settings.dailyReminders,
        weeklyReminders: !!settings.weeklyReminders,
        streakReminders: !!settings.streakReminders,
        hasSeenPrompt: !!settings.hasSeenPrompt
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
          streakReminders: false,
          hasSeenPrompt: false
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
        streakReminders: false,
        hasSeenPrompt: false
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
      streakReminders: streakReminders ?? false,
    };
    
    // If notifications are being enabled, mark the prompt as seen
    if (optedIn && pushNotifications) {
      updateData.hasSeenPrompt = true;
    }
    
    try {
      // Check if user already has settings
      const existingSettings = await prisma.$queryRaw`
        SELECT id FROM "NotificationSettings" WHERE "userId" = ${session.user.id}
      `;
      
      const settingsExist = Array.isArray(existingSettings) 
        ? existingSettings.length > 0 
        : existingSettings != null;
      
      if (settingsExist) {
        // Update existing settings
        await prisma.$executeRaw`
          UPDATE "NotificationSettings"
          SET 
            "optedIn" = ${updateData.optedIn},
            "pushNotifications" = ${updateData.pushNotifications},
            "dailyReminders" = ${updateData.dailyReminders},
            "weeklyReminders" = ${updateData.weeklyReminders},
            "streakReminders" = ${updateData.streakReminders},
            "hasSeenPrompt" = CASE 
              WHEN ${optedIn && pushNotifications} THEN true 
              ELSE "hasSeenPrompt" 
            END,
            "updatedAt" = NOW()
          WHERE "userId" = ${session.user.id}
        `;
      } else {
        // Create new settings
        await prisma.$executeRaw`
          INSERT INTO "NotificationSettings" 
          ("id", "userId", "optedIn", "pushNotifications", "dailyReminders", "weeklyReminders", "streakReminders", "hasSeenPrompt", "createdAt", "updatedAt")
          VALUES 
          (gen_random_uuid(), ${session.user.id}, ${updateData.optedIn}, ${updateData.pushNotifications}, ${updateData.dailyReminders}, ${updateData.weeklyReminders}, ${updateData.streakReminders}, ${updateData.hasSeenPrompt ?? false}, NOW(), NOW())
        `;
      }
      
      return NextResponse.json({ 
        success: true,
        optedIn: updateData.optedIn,
        pushNotifications: updateData.pushNotifications,
        dailyReminders: updateData.dailyReminders,
        weeklyReminders: updateData.weeklyReminders,
        streakReminders: updateData.streakReminders,
        hasSeenPrompt: updateData.hasSeenPrompt
      });
    } catch (dbError) {
      console.error('Database error updating notification settings:', dbError);
      return NextResponse.json(
        { error: 'Database error updating notification settings: ' + (dbError instanceof Error ? dbError.message : String(dbError)) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to update notification settings: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 