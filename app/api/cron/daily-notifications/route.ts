import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendReviewReminder } from '@/lib/notification';

// This API can be called by a cron job to send daily reminders to users
// Example Cron: 0 17 * * * - run daily at 5pm
export async function GET(request: Request) {
  try {
    // Verify the request is from a cron job using a shared secret
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || `Bearer ${cronSecret}` !== authHeader) {
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
        
        try {
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
        } catch (error) {
          console.error(`Error sending notification to user ${user.id}:`, error);
          return {
            userId: user.id,
            success: false,
            reason: 'Error sending notification',
          };
        }
      })
    );
    
    // Return summary of the notifications sent
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalUsers: users.length,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });
  } catch (error) {
    console.error('Error in daily notifications cron:', error);
    return NextResponse.json(
      { error: 'Failed to process daily notifications' },
      { status: 500 }
    );
  }
} 