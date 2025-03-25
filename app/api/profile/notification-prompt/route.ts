import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { prisma } from '@/lib/prisma';

// GET - Check if user has seen notification prompt
export async function GET() {
  try {
    const session = await auth();
    
    if (!session || !session.user || !session.user.id) {
      console.log('No authenticated session found');
      return NextResponse.json(
        { error: 'You must be logged in to check notification prompt status' },
        { status: 401 }
      );
    }
    
    console.log('Checking notification prompt status for user:', session.user.id);
    
    try {
      // Get the user's notification settings using raw query to avoid Prisma client issues
      const userSettings = await prisma.$queryRaw`
        SELECT 
          "userId", 
          "optedIn", 
          "pushNotifications",
          "hasSeenPrompt"
        FROM "NotificationSettings" 
        WHERE "userId" = ${session.user.id}
      `;
      
      // Convert result to array if it's not already
      const settingsArray = Array.isArray(userSettings) ? userSettings : [userSettings];
      
      // If no settings exist or empty array, they haven't seen the prompt
      if (!settingsArray.length) {
        console.log('No notification settings found for user');
        return NextResponse.json({
          hasSeenPrompt: false,
          hasEnabledNotifications: false
        });
      }
      
      const settings = settingsArray[0];
      
      console.log('User notification settings:', {
        hasSeenPrompt: !!settings.hasSeenPrompt,
        optedIn: !!settings.optedIn,
        pushNotifications: !!settings.pushNotifications
      });
      
      return NextResponse.json({
        hasSeenPrompt: !!settings.hasSeenPrompt,
        hasEnabledNotifications: !!settings.optedIn && !!settings.pushNotifications
      });
    } catch (dbError) {
      console.error('Database error accessing notification settings:', dbError);
      throw dbError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Error checking notification prompt status:', error);
    return NextResponse.json(
      { error: 'Failed to check notification prompt status', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST - Mark that user has seen the notification prompt
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user || !session.user.id) {
      console.log('No authenticated session found for POST');
      return NextResponse.json(
        { error: 'You must be logged in to update notification prompt status' },
        { status: 401 }
      );
    }
    
    console.log('Marking notification prompt as seen for user:', session.user.id);
    
    try {
      // Try to update existing settings first
      const updateResult = await prisma.$executeRaw`
        UPDATE "NotificationSettings"
        SET "hasSeenPrompt" = true
        WHERE "userId" = ${session.user.id}
      `;
      
      // If no rows were updated, we need to create a new record
      if (updateResult === 0) {
        console.log('No existing notification settings, creating new record');
        await prisma.$executeRaw`
          INSERT INTO "NotificationSettings" 
          ("id", "userId", "hasSeenPrompt", "optedIn", "pushNotifications", "dailyReminders", "weeklyReminders", "streakReminders", "createdAt", "updatedAt")
          VALUES 
          (gen_random_uuid(), ${session.user.id}, true, false, false, false, false, false, NOW(), NOW())
        `;
      }
      
      console.log('Successfully updated notification prompt status');
      
      return NextResponse.json({ success: true });
    } catch (dbError) {
      console.error('Database error updating notification prompt status:', dbError);
      throw dbError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Error updating notification prompt status:', error);
    return NextResponse.json(
      { error: 'Failed to update notification prompt status', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 