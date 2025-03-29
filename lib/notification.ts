import { isBrowser } from '@/lib/utils';
import { sendPushNotification as sendFCMNotification, sendMulticastPushNotification } from '@/lib/firebase/firebase-admin';
import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import { initializeFirebaseAdmin } from './firebase/firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';

type PushNotificationData = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

type StreakReminder = {
  userId: string;
  name?: string | null;
  currentStreak: number;
  hoursRemaining: number;
};

type DailyStreakReminder = {
  userId: string;
  name?: string | null;
  currentStreak: number;
};

type WeeklySummary = {
  userId: string;
  name?: string | null;
  currentStreak: number;
  weeklyReviews: number;
  totalReviews: number;
};

/**
 * Generate a random verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sends a push notification to a user
 * @param options Push notification data
 * @returns boolean indicating success
 */
export async function sendPushNotification({
  userId,
  title,
  body,
  data = {}
}: PushNotificationData): Promise<boolean> {
  try {
    
    // Get the user's notification settings and FCM token
    const userSettings = await prisma.notificationSettings.findUnique({
      where: { userId },
      select: {
        fcmToken: true,
        optedIn: true,
        pushNotifications: true
      }
    });
    
    if (!userSettings || !userSettings.optedIn || !userSettings.pushNotifications || !userSettings.fcmToken) {
      return false;
    }
    
    // Initialize Firebase Admin
    const admin = await initializeFirebaseAdmin();
    const messaging = getMessaging(admin.app());
    
    // Send message through Firebase
    const message = {
      token: userSettings.fcmToken,
      notification: {
        title,
        body,
      },
      data,
      webpush: {
        fcmOptions: {
          link: process.env.NEXTAUTH_URL || 'https://quranki.com',
        },
        notification: {
          icon: '/quranki-logo.ico',
          badge: '/quranki-logo.png',
          actions: [
            {
              action: 'open_app',
              title: 'Open App',
            },
          ],
        },
      },
    };

    const response = await messaging.send(message);
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

/**
 * Send batch notifications to multiple users
 * @param options Object containing userIds array and notification details
 * @returns Object with counts of success and failure
 */
export async function sendBatchPushNotifications({
  userIds,
  title,
  body,
  data = {}
}: {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<{ success: number; failed: number }> {
  try {
    if (!userIds.length) {
      return { success: 0, failed: 0 };
    }

    // Get FCM tokens for all users who have opted in
    const userSettings = await prisma.notificationSettings.findMany({
      where: {
        userId: { in: userIds },
        optedIn: true,
        pushNotifications: true,
        fcmToken: { not: null }
      },
      select: {
        fcmToken: true
      }
    });

    if (!userSettings.length) {
      return { success: 0, failed: 0 };
    }

    // Initialize Firebase Admin
    const admin = await initializeFirebaseAdmin();
    const messaging = getMessaging(admin.app());
    
    // Extract tokens
    const tokens = userSettings.map(setting => setting.fcmToken!).filter(Boolean);
    
    // Send in batches of 500 (Firebase limit)
    let successCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < tokens.length; i += 500) {
      const batchTokens = tokens.slice(i, i + 500);
      
      // Process each token individually since sendAll is not available
      const batchResults = await Promise.all(
        batchTokens.map(async (token) => {
          try {
            const message = {
              token,
              notification: {
                title,
                body,
              },
              data,
              webpush: {
                fcmOptions: {
                  link: process.env.NEXTAUTH_URL || 'https://quranki.com',
                },
                notification: {
                  icon: '/quranki-logo.ico',
                  badge: '/quranki-logo.png',
                  actions: [
                    {
                      action: 'open_app',
                      title: 'Open App',
                    },
                  ],
                },
              },
            };
            
            await messaging.send(message);
            return true;
          } catch (error) {
            console.error('Error sending batch notification to token:', error);
            return false;
          }
        })
      );
      
      const batchSuccessCount = batchResults.filter(success => success).length;
      successCount += batchSuccessCount;
      failedCount += (batchTokens.length - batchSuccessCount);
      
    }
    
    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('Error in batch notifications:', error);
    return { success: 0, failed: userIds.length };
  }
}

/**
 * Send daily streak reminder notification
 */
export async function sendDailyStreakReminder(params: DailyStreakReminder): Promise<boolean> {
  const { userId, name, currentStreak } = params;
  
  let title = 'Daily Quran Review Reminder';
  let body = `Time for your daily Quran review! `;
  
  if (currentStreak > 0) {
    body += `Current streak: ${currentStreak} days.`;
  } else {
    body += `Start your streak today!`;
  }
  
  return await sendPushNotification({
    userId,
    title,
    body,
    data: {
      type: 'daily_reminder',
      url: '/review'
    }
  });
}

/**
 * Send streak at risk reminder notification
 */
export async function sendStreakRiskReminder(params: StreakReminder): Promise<boolean> {
  const { userId, name, currentStreak, hoursRemaining } = params;
  
  const title = 'Your Streak is at Risk!';
  const body = `Your ${currentStreak}-day streak is about to end! You have ${hoursRemaining} hours to complete today's review.`;
  
  return await sendPushNotification({
    userId,
    title,
    body,
    data: {
      type: 'streak_risk',
      url: '/review'
    }
  });
}

/**
 * Send weekly summary notification
 */
export async function sendWeeklySummary(params: WeeklySummary): Promise<boolean> {
  const { userId, name, currentStreak, weeklyReviews, totalReviews } = params;
  
  const title = 'Your Weekly Quran Progress';
  const body = `Streak: ${currentStreak} days | This week: ${weeklyReviews} reviews | Total: ${totalReviews} reviews`;
  
  return await sendPushNotification({
    userId,
    title,
    body,
    data: {
      type: 'weekly_summary',
      url: '/profile'
    }
  });
}

/**
 * Send a review reminder to a user
 * This function is used for backwards compatibility with older code
 */
export async function sendReviewReminder(params: {
  phoneNumber?: string;
  carrier?: string;
  name?: string;
}): Promise<boolean> {

  
  // For backwards compatibility, we'll log the call but return true
  // In the future, you can implement SMS notifications here if needed
  return true;
} 