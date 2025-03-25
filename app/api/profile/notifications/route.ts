import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { prisma } from '@/lib/prisma';

interface NotificationUpdateData {
  optedIn: boolean;
  emailNotifications: boolean;
  dailyReminders: boolean;
  weeklyReminders: boolean;
  streakReminders: boolean;
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
      const settings = await prisma.notificationSettings.findUnique({
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
      // Use upsert to either create new settings or update existing ones
      const settings = await prisma.notificationSettings.upsert({
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