import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { prisma } from '@/lib/prisma';
import { sendReviewReminder } from '@/lib/notification';

// This API can be called by a cron job to send reminders to users
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    // Only allow admins or authenticated cron jobs to access this endpoint
    // In a real application, you would implement proper authentication for cron jobs
    const isAdmin = session?.user?.email === 'admin@quranki.com';
    const apiKey = request.headers.get('x-api-key');
    const isAuthorizedCron = apiKey === process.env.NOTIFICATION_API_KEY;
    
    if (!isAdmin && !isAuthorizedCron) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Find all users who have opted in for notifications and have verified phone numbers
    const users = await prisma.user.findMany({
      where: {
        notificationSettings: {
          optedIn: true,
          verifiedPhone: true,
          NOT: {
            phoneNumber: null,
            mobileCarrier: null,
          },
        },
      },
      include: {
        notificationSettings: true,
      },
    });
    
    // Send notifications to each eligible user
    const results = await Promise.all(
      users.map(async (user) => {
        const settings = user.notificationSettings;
        
        if (!settings || !settings.phoneNumber || !settings.mobileCarrier) {
          return {
            userId: user.id,
            success: false,
            reason: 'Missing phone number or carrier',
          };
        }
        
        // Send the reminder
        const success = await sendReviewReminder({
          phoneNumber: settings.phoneNumber,
          carrier: settings.mobileCarrier,
          name: user.name || undefined,
        });
        
        return {
          userId: user.id,
          success,
          reason: success ? 'Sent successfully' : 'Failed to send',
        };
      })
    );
    
    // Return summary of the notifications sent
    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      details: results,
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
} 