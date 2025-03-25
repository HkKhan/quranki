import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendDailyStreakReminder, sendStreakRiskReminder, sendWeeklySummary } from '@/lib/notification';

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
    
    // Get all users with notification settings opted in
    const users = await prisma.$queryRaw`
      SELECT u.id, u.name, u.email, ns."dailyReminders", ns."weeklyReminders", ns."streakReminders", ns."emailNotifications", ns."optedIn"
      FROM "User" u
      JOIN "NotificationSettings" ns ON u.id = ns."userId"
      WHERE ns."optedIn" = true AND ns."emailNotifications" = true
    `;

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({
        message: 'No users with notifications enabled',
        users: 0
      });
    }

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

    // Track notifications sent
    let dailyRemindersSent = 0;
    let riskRemindersSent = 0;
    let weeklySummariesSent = 0;
    
    // Process each user
    for (const user of users) {
      // Skip users who don't want email notifications
      if (!user.emailNotifications) continue;
      
      const currentStreak = streakMap.get(user.id) || 0;
      const userEmail = user.email;
      const userName = user.name;
      
      // Daily reminder - send at 8am UTC (adjust as needed)
      if (hour === 8 && user.dailyReminders) {
        const success = await sendDailyStreakReminder({
          email: userEmail,
          name: userName,
          currentStreak
        });
        
        if (success) dailyRemindersSent++;
      }
      
      // Streak risk reminder - send at 20:00 UTC (8pm) to remind users with no activity that day
      // Users can opt-in to these notifications independently with streakReminders
      if (hour === 20 && user.streakReminders) {
        // Check if the user has had activity today
        const todayDate = new Date().toISOString().split('T')[0];
        const todayActivity = await prisma.$queryRaw`
          SELECT COUNT(*) as "count" 
          FROM "DailyLog" 
          WHERE "userId" = ${user.id} AND date = ${todayDate}
        `;
        
        const hasActivityToday = Array.isArray(todayActivity) && 
                                todayActivity.length > 0 && 
                                todayActivity[0].count > 0;
        
        // If no activity today and streak > 0, send risk reminder
        if (!hasActivityToday && currentStreak > 0) {
          const success = await sendStreakRiskReminder({
            email: userEmail,
            name: userName,
            currentStreak,
            hoursRemaining: 4 // Adjust based on your timezone and day cutoff
          });
          
          if (success) riskRemindersSent++;
        }
      }
      
      // Weekly summary - send on Sundays at 12:00 UTC
      const dayOfWeek = now.getUTCDay(); // 0 = Sunday
      if (dayOfWeek === 0 && hour === 12 && user.weeklyReminders) {
        // Calculate weekly stats
        const weekStartDate = new Date();
        weekStartDate.setUTCDate(now.getUTCDate() - 7);
        const weekStart = weekStartDate.toISOString().split('T')[0];
        
        const weeklyStats = await prisma.$queryRaw`
          SELECT COUNT(*) as "count" 
          FROM "DailyLog" 
          WHERE "userId" = ${user.id} AND date >= ${weekStart}
        `;
        
        const weeklyReviews = Array.isArray(weeklyStats) && 
                            weeklyStats.length > 0 ? 
                            weeklyStats[0].count : 0;
        
        // Get total reviews
        const totalStats = await prisma.$queryRaw`
          SELECT COUNT(*) as "count" 
          FROM "DailyLog" 
          WHERE "userId" = ${user.id}
        `;
        
        const totalReviews = Array.isArray(totalStats) && 
                           totalStats.length > 0 ? 
                           totalStats[0].count : 0;
        
        const success = await sendWeeklySummary({
          email: userEmail,
          name: userName,
          currentStreak,
          weeklyReviews,
          totalReviews
        });
        
        if (success) weeklySummariesSent++;
      }
    }
    
    return NextResponse.json({
      message: 'Streak reminders processed',
      totalUsers: users.length,
      dailyRemindersSent,
      riskRemindersSent,
      weeklySummariesSent
    });
  } catch (error) {
    console.error('Error processing streak reminders:', error);
    return NextResponse.json(
      { error: 'Failed to process streak reminders' },
      { status: 500 }
    );
  }
} 