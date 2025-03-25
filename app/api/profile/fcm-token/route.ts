import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { prisma } from '@/lib/prisma';

// POST - Register FCM token for push notifications
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    // Check authentication
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'You must be logged in to register for push notifications' },
        { status: 401 }
      );
    }
    
    // Get FCM token from request
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: 'No FCM token provided' },
        { status: 400 }
      );
    }
    
    // Update or create notification settings with FCM token
    try {
      const settings = await prisma.notificationSettings.upsert({
        where: {
          userId: session.user.id
        },
        update: {
          fcmToken: token,
          fcmTokenCreatedAt: new Date(),
          pushNotifications: true
        },
        create: {
          userId: session.user.id,
          optedIn: true,
          pushNotifications: true,
          emailNotifications: true,
          fcmToken: token,
          fcmTokenCreatedAt: new Date(),
          dailyReminders: false,
          weeklyReminders: false,
          streakReminders: false
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'FCM token registered successfully'
      });
    } catch (dbError) {
      console.error('Database error saving FCM token:', dbError);
      return NextResponse.json(
        { error: 'Database error saving FCM token' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return NextResponse.json(
      { error: 'Failed to register FCM token' },
      { status: 500 }
    );
  }
} 