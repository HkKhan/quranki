// Helper to check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

/**
 * Generate a random verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send an email notification to a user
 */
export async function sendEmailNotification({
  email,
  subject,
  message
}: {
  email: string;
  subject: string;
  message: string;
}): Promise<boolean> {
  console.log('Starting email notification process for:', email);
  
  if (!email) {
    console.error('No email provided for notification');
    return false;
  }

  try {
    // Server-side: Use our email API to send the email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const apiUrl = isBrowser ? '/api/send-email' : `${siteUrl}/api/send-email`;
    
    // Get the API key - handle both client and server side contexts
    const apiKey = process.env.NOTIFICATION_API_KEY;
    if (!apiKey) {
      console.error('NOTIFICATION_API_KEY is not set');
      return false;
    }

    // Log the environment for debugging (excluding sensitive data)
    console.log('Email notification environment:', {
      isDevelopment: process.env.NODE_ENV === 'development',
      siteUrl,
      hasApiKey: !!apiKey,
      hasEmailConfig: !!process.env.NOTIFICATION_EMAIL,
      hasEmailPassword: !!process.env.NOTIFICATION_EMAIL_PASSWORD,
      apiUrl,
      isBrowser,
      messageLength: message.length
    });
    
    console.log('Sending request to email API...');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        to: email,
        subject,
        text: message,
        from: `"QuranKi" <${process.env.NOTIFICATION_EMAIL || 'contactquranki@gmail.com'}>`,
      }),
    });
    
    console.log('Received response from email API:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Failed to send email notification:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return false;
    }

    const responseData = await response.json();
    console.log('Email notification response:', responseData);
    return true;
  } catch (error) {
    console.error('Error sending email notification:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

/**
 * Send a daily streak reminder email
 */
export async function sendDailyStreakReminder({
  email,
  name,
  currentStreak = 0
}: {
  email: string;
  name?: string;
  currentStreak?: number;
}): Promise<boolean> {
  const greeting = name ? `Assalamu Alaikum ${name}` : 'Assalamu Alaikum';
  let message = `${greeting},\n\nThis is your daily reminder to review the Quran on QuranKi.`;
  
  if (currentStreak > 0) {
    message += `\n\nYou currently have a ${currentStreak}-day streak! MashaAllah, keep it up!`;
  }
  
  message += '\n\nLogin to QuranKi to continue your practice: https://quranki.vercel.app/';
  message += '\n\nJazakAllah khair,\nThe QuranKi Team';

  return sendEmailNotification({
    email,
    subject: 'Your Daily Quran Review Reminder',
    message
  });
}

/**
 * Send a streak-at-risk warning email
 */
export async function sendStreakRiskReminder({
  email,
  name,
  currentStreak = 0,
  hoursRemaining = 24
}: {
  email: string;
  name?: string;
  currentStreak?: number;
  hoursRemaining?: number;
}): Promise<boolean> {
  const greeting = name ? `Assalamu Alaikum ${name}` : 'Assalamu Alaikum';
  let message = `${greeting},\n\n`;
  
  if (currentStreak > 0) {
    message += `Your ${currentStreak}-day Quran review streak is at risk! `;
    message += `You have approximately ${hoursRemaining} hours to complete today's review.`;
  } else {
    message += `Don't forget to review the Quran today! You have approximately ${hoursRemaining} hours left to complete today's review.`;
  }
  
  message += '\n\nLogin to QuranKi now to keep your streak going: https://quranki.vercel.app/';
  message += '\n\nJazakAllah khair,\nThe QuranKi Team';

  return sendEmailNotification({
    email,
    subject: 'Your Quran Review Streak is at Risk!',
    message
  });
}

/**
 * Send a weekly summary email
 */
export async function sendWeeklySummary({
  email,
  name,
  currentStreak = 0,
  totalReviews = 0,
  weeklyReviews = 0
}: {
  email: string;
  name?: string;
  currentStreak?: number;
  totalReviews?: number;
  weeklyReviews?: number;
}): Promise<boolean> {
  const greeting = name ? `Assalamu Alaikum ${name}` : 'Assalamu Alaikum';
  let message = `${greeting},\n\nHere's your weekly QuranKi progress summary:\n\n`;
  
  message += `- Current streak: ${currentStreak} days\n`;
  
  if (weeklyReviews > 0) {
    message += `- Reviews this week: ${weeklyReviews}\n`;
  }
  
  if (totalReviews > 0) {
    message += `- Total reviews: ${totalReviews}\n`;
  }
  
  message += '\nKeep up the great work! Remember, consistency is key to memorizing and maintaining your Quran knowledge.';
  message += '\n\nLogin to QuranKi to continue your journey: https://quranki.com';
  message += '\n\nJazakAllah khair,\nThe QuranKi Team';

  return sendEmailNotification({
    email,
    subject: 'Your Weekly QuranKi Progress Summary',
    message
  });
} 