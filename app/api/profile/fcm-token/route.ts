import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { prisma } from '@/lib/prisma';
import { sendPushNotification } from '@/lib/notification';

// POST - Update FCM token
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'You must be logged in to update FCM token' },
        { status: 401 }
      );
    }
    
    const data = await request.json();
    const { token } = data;
    
    if (!token) {
      return NextResponse.json(
        { error: 'FCM token is required' },
        { status: 400 }
      );
    }
    
    try {
      // Get existing settings to check if this is a new registration
      const existingSettings = await prisma.notificationSettings.findUnique({
        where: { userId: session.user.id },
        select: { fcmToken: true }
      });

      const isNewRegistration = !existingSettings?.fcmToken;
      
      // Use upsert to create or update notification settings with the FCM token
      const updatedSettings = await prisma.notificationSettings.upsert({
        where: {
          userId: session.user.id
        },
        create: {
          userId: session.user.id,
          fcmToken: token,
          fcmTokenCreatedAt: new Date(),
          optedIn: true,
          pushNotifications: true,
          dailyReminders: true,
          weeklyReminders: true,
          streakReminders: true
        },
        update: {
          fcmToken: token,
          fcmTokenCreatedAt: new Date()
        }
      });

      // Send welcome notification only in production and only for new registrations
      if (isNewRegistration && process.env.NODE_ENV === 'production') {
        await sendPushNotification({
          userId: session.user.id,
          title: '🎉 Welcome to QuranKi Notifications!',
          body: 'You will now receive reminders for your daily Quran review, streak alerts, and weekly summaries.',
          data: {
            type: 'welcome',
            url: '/profile'
          }
        });
      }
      
      return NextResponse.json({ 
        success: true,
        message: 'FCM token updated successfully'
      });
    } catch (dbError) {
      console.error('Database error saving FCM token:', dbError);
      return NextResponse.json(
        { error: 'Database error saving FCM token' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating FCM token:', error);
    return NextResponse.json(
      { error: 'Failed to update FCM token' },
      { status: 500 }
    );
  }
} 