import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { 
  sendDailyStreakReminder, 
  sendStreakRiskReminder, 
  sendWeeklySummary, 
  sendEmailNotification 
} from '@/lib/notification';

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
    
    // Get user email from session
    const userEmail = session.user.email;
    const userName = session.user.name || 'Test User';
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'No email address found in your profile' },
        { status: 400 }
      );
    }

    console.log(`Sending test notification to ${userEmail}`);

    // Send a test notification with all three types of content
    const testMessage = `
Assalamu Alaikum ${userName},

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

Login to QuranKi to continue your journey: https://quranki.vercel.app/

This is a test message sent at ${new Date().toLocaleString()}.

Jazakallah khair,
The QuranKi Team
    `;

    const success = await sendEmailNotification({
      email: userEmail,
      subject: 'QuranKi Test Notification',
      message: testMessage
    });

    if (success) {
      console.log('Test notification sent successfully');
      return NextResponse.json({ 
        success: true,
        message: 'Test notification sent successfully' 
      });
    } else {
      throw new Error('Failed to send test notification');
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
} 