import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { sendPushNotification } from '@/lib/notification';
import { prisma } from '@/lib/prisma';

// POST endpoint for test notifications
export async function POST(request: Request) {
  // Ensure this endpoint only works in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const session = await auth();
    
    // Check authentication
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'You must be logged in to send test notifications' },
        { status: 401 }
      );
    }
    
    // Get user FCM token
    const userName = session.user.name || 'Test User';
    
    // Get user notification settings
    const notificationSettings = await prisma.notificationSettings.findUnique({
      where: { userId: session.user.id },
      select: { 
        optedIn: true, 
        pushNotifications: true, 
        fcmToken: true 
      }
    });

    // Check if push notifications are enabled
    if (!notificationSettings?.optedIn || !notificationSettings?.pushNotifications) {
      return NextResponse.json({
        success: false,
        message: 'You have not enabled push notifications. Please enable them in your profile settings.',
        notificationSettings: {
          optedIn: notificationSettings?.optedIn,
          pushEnabled: notificationSettings?.pushNotifications,
          hasFcmToken: !!notificationSettings?.fcmToken
        }
      }, { status: 400 });
    }

    // Check if FCM token exists
    if (!notificationSettings.fcmToken) {
      return NextResponse.json({
        success: false,
        message: 'No FCM token found. Please reload the page and allow notifications when prompted.',
      }, { status: 400 });
    }

    // Create test notification message
    const testTitle = 'QuranKi Test Notification';
    const testMessage = `
This is a TEST notification from QuranKi. 

Here's a sample of the different types of notifications you might receive:

1. DAILY REMINDER:
You currently have a 5-day streak! MashaAllah, keep it up!

2. STREAK ALERT:
Your streak is at risk! You have approximately 4 hours to complete today's review.

3. WEEKLY SUMMARY:
- Current streak: 5 days
- Reviews this week: 24
- Total reviews: 125

Keep up the great work! Remember, consistency is key to memorizing and maintaining your Quran knowledge.

This is a test message sent at ${new Date().toLocaleString()}.
    `;

    // Send push notification
    const success = await sendPushNotification({
      userId: session.user.id,
      title: testTitle,
      body: 'This is a test push notification from QuranKi. Tap to see more details.',
      data: {
        type: 'test',
        message: testMessage.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      }
    });

    if (success) {
      return NextResponse.json({ 
        success: true,
        message: 'Test push notification sent successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send test notification. Please check your browser notification settings.',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
} 