import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { prisma } from '@/lib/prisma';

interface NotificationUpdateData {
  optedIn: boolean;
  emailNotifications: boolean;
  dailyReminders: boolean;
  weeklyReminders: boolean;
  streakReminders: boolean;
}

// GET - Fetch notification settings
export async function GET() {
  try {
    const session = await auth();
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'You must be logged in to view notification settings' },
        { status: 401 }
      );
    }
    
    try {
      // Using findFirst as a fallback in case unique constraints aren't working correctly
      const settings = await prisma.$queryRaw`
        SELECT * FROM "NotificationSettings" WHERE "userId" = ${session.user.id}
      `;
      
      // Check if settings is an array with data
      const settingsData = Array.isArray(settings) && settings.length > 0 ? settings[0] : null;
      
      // Return empty settings if none exist yet
      if (!settingsData) {
        return NextResponse.json({ 
          optedIn: false,
          emailNotifications: true,
          dailyReminders: false,
          weeklyReminders: false,
          streakReminders: false
        });
      }
      
      return NextResponse.json({ 
        optedIn: settingsData.optedIn,
        emailNotifications: settingsData.emailNotifications ?? true,
        dailyReminders: settingsData.dailyReminders ?? false,
        weeklyReminders: settingsData.weeklyReminders ?? false,
        streakReminders: settingsData.streakReminders ?? false
      });
    } catch (dbError) {
      console.error('Database error fetching notification settings:', dbError);
      return NextResponse.json(
        { 
          error: 'Database error fetching notification settings',
          optedIn: false,
          emailNotifications: true,
          dailyReminders: false,
          weeklyReminders: false,
          streakReminders: false
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    // Always return a valid JSON response even on error
    return NextResponse.json(
      { 
        error: 'Failed to fetch notification settings',
        optedIn: false,
        emailNotifications: true,
        dailyReminders: false,
        weeklyReminders: false,
        streakReminders: false
      },
      { status: 500 }
    );
  }
}

// POST - Update notification settings
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'You must be logged in to update notification settings' },
        { status: 401 }
      );
    }
    
    const data = await request.json();
    const { optedIn, emailNotifications, dailyReminders, weeklyReminders, streakReminders } = data;
    
    // Prepare data for upsert operation
    const updateData: NotificationUpdateData = {
      optedIn: optedIn ?? false,
      emailNotifications: emailNotifications ?? true,
      dailyReminders: dailyReminders ?? false,
      weeklyReminders: weeklyReminders ?? false,
      streakReminders: streakReminders ?? false
    };
    
    try {
      // Check if settings already exist
      const existingSettings = await prisma.$queryRaw`
        SELECT * FROM "NotificationSettings" WHERE "userId" = ${session.user.id}
      `;
      
      let settings;
      
      if (Array.isArray(existingSettings) && existingSettings.length > 0) {
        // Update existing settings
        await prisma.$executeRaw`
          UPDATE "NotificationSettings"
          SET 
            "optedIn" = ${updateData.optedIn},
            "emailNotifications" = ${updateData.emailNotifications},
            "dailyReminders" = ${updateData.dailyReminders},
            "weeklyReminders" = ${updateData.weeklyReminders},
            "streakReminders" = ${updateData.streakReminders},
            "updatedAt" = NOW()
          WHERE "userId" = ${session.user.id}
        `;
        
        // Fetch the updated settings
        const updatedSettings = await prisma.$queryRaw`
          SELECT * FROM "NotificationSettings" WHERE "userId" = ${session.user.id}
        `;
        
        settings = Array.isArray(updatedSettings) && updatedSettings.length > 0 ? updatedSettings[0] : null;
      } else {
        // Create new settings
        await prisma.$executeRaw`
          INSERT INTO "NotificationSettings" 
          ("userId", "optedIn", "emailNotifications", "dailyReminders", "weeklyReminders", "streakReminders", "createdAt", "updatedAt")
          VALUES (
            ${session.user.id},
            ${updateData.optedIn},
            ${updateData.emailNotifications},
            ${updateData.dailyReminders},
            ${updateData.weeklyReminders},
            ${updateData.streakReminders},
            NOW(),
            NOW()
          )
        `;
        
        // Fetch the new settings
        const newSettings = await prisma.$queryRaw`
          SELECT * FROM "NotificationSettings" WHERE "userId" = ${session.user.id}
        `;
        
        settings = Array.isArray(newSettings) && newSettings.length > 0 ? newSettings[0] : null;
      }
      
      if (!settings) {
        throw new Error('Failed to update or retrieve settings');
      }
      
      // Use the retrieved settings
      return NextResponse.json({ 
        success: true,
        optedIn: settings.optedIn,
        emailNotifications: settings.emailNotifications,
        dailyReminders: settings.dailyReminders,
        weeklyReminders: settings.weeklyReminders,
        streakReminders: settings.streakReminders
      });
    } catch (prismaError) {
      console.error('Database error updating notification settings:', prismaError);
      return NextResponse.json(
        { error: 'Database error while updating notification settings' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    );
  }
} 