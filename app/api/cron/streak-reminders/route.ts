import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendDailyStreakReminder, sendStreakRiskReminder, sendWeeklySummary, sendBatchPushNotifications } from '@/lib/notification';

// Helper function to group users by notification type
async function getUsersForNotification(notificationType: 'dailyReminders' | 'streakReminders' | 'weeklyReminders') {
  // Get all users with notification settings opted in
  return await prisma.$queryRaw`
    SELECT u.id, u.name, ns."dailyReminders", ns."weeklyReminders", ns."streakReminders", 
           ns."pushNotifications", ns."optedIn", ns."fcmToken"
    FROM "User" u
    JOIN "NotificationSettings" ns ON u.id = ns."userId"
    WHERE ns."optedIn" = true 
    AND ns."pushNotifications" = true
    AND ns."${notificationType}" = true
    AND ns."fcmToken" IS NOT NULL
  `;
}

// Ensure this route is only called by a cron job
export async function GET(request: Request) {
  try {
    // Validate the API key
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    if (token !== process.env.CRON_API_KEY) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Determine what type of notification to send based on the time
    const now = new Date();
    const hour = now.getUTCHours();
    
    // Track notifications sent
    let dailyRemindersSent = 0;
    let riskRemindersSent = 0;
    let weeklySummariesSent = 0;
    
    // Get the current streak for each user
    // This is a simplified version - you'll need to implement actual streak calculation logic
    const userStreaks = await prisma.$queryRaw`
      SELECT "userId", COUNT(DISTINCT date) as "streakDays"
      FROM "DailyLog"
      WHERE date >= NOW() - INTERVAL '30 days'
      GROUP BY "userId"
    `;

    const streakMap = new Map();
    if (Array.isArray(userStreaks)) {
      for (const streak of userStreaks) {
        streakMap.set(streak.userId, streak.streakDays);
      }
    }

    // DAILY REMINDERS - send at 8am UTC (adjust as needed)
    if (hour === 8) {
      const dailyUsers = await getUsersForNotification('dailyReminders');
      
      if (Array.isArray(dailyUsers) && dailyUsers.length > 0) {
        
        // Process individual notifications
        for (const user of dailyUsers) {
          const currentStreak = streakMap.get(user.id) || 0;
          
          const success = await sendDailyStreakReminder({
            userId: user.id,
            name: user.name,
            currentStreak
          });
          
          if (success) dailyRemindersSent++;
        }
        
        // Alternative: Process push notifications in batch
        const userIds = dailyUsers.map(user => user.id);
        
        if (userIds.length > 0) {
          // Create a generic message for all users since we're sending in batch
          const result = await sendBatchPushNotifications({
            userIds,
            title: 'Daily Quran Review Reminder',
            body: 'Time for your daily Quran review. Keep your streak going!',
            data: {
              type: 'daily_reminder',
              url: 'https://quranki.com/'
            }
          });
          
          // Replace the individual count with the batch count if using batch
          // dailyRemindersSent = result.success;
        }
      }
    }
    
    // STREAK RISK REMINDER - send at 20:00 UTC (8pm) to remind users with no activity that day
    if (hour === 20) {
      const riskUsers = await getUsersForNotification('streakReminders');
      
      if (Array.isArray(riskUsers) && riskUsers.length > 0) {
        
        // Filter users who haven't had activity today but have streaks
        const usersAtRisk = [];
        const todayDate = new Date().toISOString().split('T')[0];
        
        for (const user of riskUsers) {
          const currentStreak = streakMap.get(user.id) || 0;
          
          // Skip users with no streak
          if (currentStreak === 0) continue;
          
          // Check if the user has had activity today
          const todayActivity = await prisma.$queryRaw`
            SELECT COUNT(*) as "count" 
            FROM "DailyLog" 
            WHERE "userId" = ${user.id} AND date = ${todayDate}
          `;
          
          const hasActivityToday = Array.isArray(todayActivity) && 
                                todayActivity.length > 0 && 
                                todayActivity[0].count > 0;
          
          // If no activity today and streak > 0, add to at-risk list
          if (!hasActivityToday) {
            usersAtRisk.push({...user, currentStreak});
          }
        }
        
        // Process individual notifications
        for (const user of usersAtRisk) {
          const success = await sendStreakRiskReminder({
            userId: user.id,
            name: user.name,
            currentStreak: user.currentStreak,
            hoursRemaining: 4 // Adjust based on your timezone and day cutoff
          });
          
          if (success) riskRemindersSent++;
        }
        
        // Alternative: Process push notifications in batch
        const userIds = usersAtRisk.map(user => user.id);
        
        if (userIds.length > 0) {
          const result = await sendBatchPushNotifications({
            userIds,
            title: 'Your Streak is at Risk!',
            body: 'Your Quran review streak is at risk! Complete today\'s review to keep it going.',
            data: {
              type: 'streak_risk',
              url: 'https://quranki.com/'
            }
          });
          
          // Replace the individual count with the batch count if using batch
          // riskRemindersSent = result.success;
        }
      }
    }
    
    // WEEKLY SUMMARY - send on Sundays at 12:00 UTC
    const dayOfWeek = now.getUTCDay();
    if (dayOfWeek === 0 && hour === 12) {
      const weeklyUsers = await getUsersForNotification('weeklyReminders');
      
      if (Array.isArray(weeklyUsers) && weeklyUsers.length > 0) {
        
        // Calculate weekly reviews for each user
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
        
        const weeklyReviewsData = await prisma.$queryRaw`
          SELECT "userId", COUNT(*) as "count"
          FROM "DailyLog"
          WHERE date >= ${oneWeekAgoStr}
          GROUP BY "userId"
        `;
        
        const weeklyReviewsMap = new Map();
        if (Array.isArray(weeklyReviewsData)) {
          for (const data of weeklyReviewsData) {
            weeklyReviewsMap.set(data.userId, data.count);
          }
        }
        
        // Calculate total reviews for each user
        const totalReviewsData = await prisma.$queryRaw`
          SELECT "userId", COUNT(*) as "count"
          FROM "DailyLog"
          GROUP BY "userId"
        `;
        
        const totalReviewsMap = new Map();
        if (Array.isArray(totalReviewsData)) {
          for (const data of totalReviewsData) {
            totalReviewsMap.set(data.userId, data.count);
          }
        }
        
        // Individual push notifications for weekly summaries because they contain user-specific data
        for (const user of weeklyUsers) {
          const currentStreak = streakMap.get(user.id) || 0;
          const weeklyReviews = weeklyReviewsMap.get(user.id) || 0;
          const totalReviews = totalReviewsMap.get(user.id) || 0;
          
          const success = await sendWeeklySummary({
            userId: user.id,
            name: user.name,
            currentStreak,
            weeklyReviews,
            totalReviews
          });
          
          if (success) weeklySummariesSent++;
        }
      }
    }
    
    // Return summary of the notifications sent
    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      dailyRemindersSent,
      riskRemindersSent,
      weeklySummariesSent,
      totalSent: dailyRemindersSent + riskRemindersSent + weeklySummariesSent
    });
  } catch (error) {
    console.error('Error in notifications cron:', error);
    return NextResponse.json(
      { error: 'Failed to process notifications' },
      { status: 500 }
    );
  }
} 