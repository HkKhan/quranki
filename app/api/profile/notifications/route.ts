import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { prisma } from '@/lib/prisma';
import { sendEmailNotification } from '@/lib/notification';

interface NotificationUpdateData {
  optedIn: boolean;
  emailNotifications: boolean;
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
      const settings = await prisma.NotificationSettings.findUnique({
        where: { userId: session.user.id }
      });
      
      // Return empty settings if none exist yet
      if (!settings) {
        return NextResponse.json({ 
          optedIn: false,
          emailNotifications: true,
          dailyReminders: false,
          weeklyReminders: false,
          streakReminders: false
        });
      }
      
      return NextResponse.json({ 
        optedIn: settings.optedIn,
        emailNotifications: settings.emailNotifications ?? true,
        dailyReminders: settings.dailyReminders ?? false,
        weeklyReminders: settings.weeklyReminders ?? false,
        streakReminders: settings.streakReminders ?? false
      });
    } catch (dbError) {
      console.error('Database error fetching notification settings:', dbError);
      return NextResponse.json(
        { 
          error: 'Database error fetching notification settings',
          optedIn: false,
          emailNotifications: true,
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
        emailNotifications: true,
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
    const { optedIn, emailNotifications, dailyReminders, weeklyReminders, streakReminders } = data;
    
    // Prepare data for upsert operation
    const updateData: NotificationUpdateData = {
      optedIn: optedIn ?? false,
      emailNotifications: emailNotifications ?? true,
      dailyReminders: dailyReminders ?? false,
      weeklyReminders: weeklyReminders ?? false,
      streakReminders: streakReminders ?? false
    };
    
    try {
      // Check if user already has notification settings
      const existingSettings = await prisma.NotificationSettings.findUnique({
        where: { userId: session.user.id }
      });
      
      // Use upsert to either create new settings or update existing ones
      const settings = await prisma.NotificationSettings.upsert({
        where: {
          userId: session.user.id
        },
        update: {
          optedIn: updateData.optedIn,
          emailNotifications: updateData.emailNotifications,
          dailyReminders: updateData.dailyReminders,
          weeklyReminders: updateData.weeklyReminders,
          streakReminders: updateData.streakReminders,
        },
        create: {
          userId: session.user.id,
          optedIn: updateData.optedIn,
          emailNotifications: updateData.emailNotifications,
          dailyReminders: updateData.dailyReminders,
          weeklyReminders: updateData.weeklyReminders,
          streakReminders: updateData.streakReminders,
        }
      });
      
      // Send confirmation email
      if (session.user.email) {
        const isFirstTime = !existingSettings;
        const notificationSummary = getNotificationSummary(settings);
        
        let emailSubject = isFirstTime 
          ? 'Welcome to QuranKi Notifications!' 
          : 'QuranKi Notification Settings Updated';
        
        let emailMessage = `Assalamu Alaikum${session.user.name ? ` ${session.user.name}` : ''},\n\n`;
        
        if (isFirstTime) {
          emailMessage += `Thank you for signing up for QuranKi notifications! We're excited to help you stay consistent with your Quran practice.\n\n`;
        } else {
          emailMessage += `Your QuranKi notification settings have been updated successfully.\n\n`;
        }
        
        if (settings.optedIn) {
          emailMessage += `You will receive the following notifications:\n${notificationSummary}\n\n`;
          emailMessage += `These notifications will be sent to: ${session.user.email}\n\n`;
        } else {
          emailMessage += `You have opted out of notifications. You can enable them again at any time from your profile settings.\n\n`;
        }
        
        emailMessage += `You can update your notification preferences at any time from your QuranKi profile settings.\n\n`;
        emailMessage += `Jazakallah khair,\nThe QuranKi Team`;
        
        await sendEmailNotification({
          email: session.user.email,
          subject: emailSubject,
          message: emailMessage
        });
      }
      
      return NextResponse.json({ 
        success: true,
        optedIn: settings.optedIn,
        emailNotifications: settings.emailNotifications,
        dailyReminders: settings.dailyReminders,
        weeklyReminders: settings.weeklyReminders,
        streakReminders: settings.streakReminders
      });
    } catch (prismaError) {
      console.error('Database error updating notification settings:', prismaError);
      return NextResponse.json(
        { error: 'Database error while updating notification settings' },
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