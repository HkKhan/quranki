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
      const userSettings = await prisma.notificationSettings.findUnique({
        where: {
          userId: session.user.id
        },
        select: {
          optedIn: true,
          pushNotifications: true,
          dailyReminders: true,
          weeklyReminders: true,
          streakReminders: true
        }
      });
      
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
      
      return NextResponse.json(userSettings);
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
      // Use upsert to either create or update settings
      const updatedSettings = await prisma.notificationSettings.upsert({
        where: {
          userId: session.user.id
        },
        create: {
          userId: session.user.id,
          ...updateData
        },
        update: updateData,
        select: {
          optedIn: true,
          pushNotifications: true,
          dailyReminders: true,
          weeklyReminders: true,
          streakReminders: true
        }
      });
      
      return NextResponse.json({ 
        success: true,
        ...updatedSettings
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