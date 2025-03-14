import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerAuthSession } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get the current user session
    const session = await getServerAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");
    const aggregate = searchParams.get("aggregate") === "true";
    
    let dailyLogs;
    let logs;
    
    if (date) {
      // Fetch logs for a specific date
      dailyLogs = await prisma.dailyLog.findMany({
        where: { 
          userId,
          date 
        },
        orderBy: {
          createdAt: "desc"
        }
      });
      
      if (aggregate) {
        // Calculate totals for each date
        const totalCount = dailyLogs.reduce((total, log) => total + log.count, 0);
        logs = [{ date, count: totalCount }];
      } else {
        logs = dailyLogs;
      }
    } else {
      // Fetch all logs
      dailyLogs = await prisma.dailyLog.findMany({
        where: { userId },
        orderBy: {
          date: "desc"
        }
      });
      
      if (aggregate) {
        // Group by date and sum up counts
        const aggregatedLogs = dailyLogs.reduce((acc, log) => {
          const date = log.date;
          if (!acc[date]) {
            acc[date] = { date, count: 0 };
          }
          acc[date].count += log.count;
          return acc;
        }, {} as Record<string, { date: string, count: number }>);
        
        // Convert to array and sort by date (newest first)
        logs = Object.values(aggregatedLogs).sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      } else {
        logs = dailyLogs;
      }
    }
    
    return NextResponse.json(
      { success: true, logs },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching daily logs:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching daily logs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the current user session
    const session = await getServerAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const { date, ayahKey, count } = await request.json();
    
    if (!date || !ayahKey) {
      return NextResponse.json(
        { success: false, message: "Date and ayahKey are required" },
        { status: 400 }
      );
    }
    
    // Create or update the daily log
    const dailyLog = await prisma.dailyLog.upsert({
      where: {
        userId_date_ayahKey: {
          userId,
          date,
          ayahKey
        }
      },
      update: {
        count: count || 1
      },
      create: {
        userId,
        date,
        ayahKey,
        count: count || 1
      }
    });
    
    return NextResponse.json(
      { success: true, dailyLog },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating daily log:", error);
    return NextResponse.json(
      { success: false, message: "Error creating daily log" },
      { status: 500 }
    );
  }
} 