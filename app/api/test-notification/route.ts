import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { sendPushNotification } from '@/lib/notification';
import { prisma } from '@/lib/prisma';

// POST endpoint for test notifications
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    // Check authentication
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'You must be logged in to send test notifications' },
        { status: 401 }
      );
    }
    
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

    // Send push notification with more detailed payload
    const success = await sendPushNotification({
      userId: session.user.id,
      title: '🔔 Test Notification',
      body: 'This is a test notification from QuranKi. If you see this, notifications are working!',
      data: {
        type: 'test',
        url: '/profile',
        timestamp: new Date().toISOString(),
        userId: session.user.id,
        source: 'test_notification'
      }
    });

    if (success) {
      return NextResponse.json({ 
        success: true,
        message: 'Test notification sent successfully',
        debug: {
          userId: session.user.id,
          fcmToken: notificationSettings.fcmToken.substring(0, 10) + '...',
          timestamp: new Date().toISOString()
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send notification. Please check your browser notification settings.',
        debug: {
          userId: session.user.id,
          fcmToken: notificationSettings.fcmToken.substring(0, 10) + '...',
          timestamp: new Date().toISOString()
        }
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