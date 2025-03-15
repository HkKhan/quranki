import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get the current user session
    const session = await getServerAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Parse query parameters
    const url = new URL(request.url);
    const year = url.searchParams.get("year") 
      ? parseInt(url.searchParams.get("year") as string) 
      : new Date().getFullYear();
    
    // Create start and end dates for the requested year
    const startDate = new Date(year, 0, 1); // January 1st
    const endDate = new Date(year, 11, 31, 23, 59, 59); // December 31st, 23:59:59
    
    // Convert to ISO strings for database query
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();
    
    // Get all daily logs for the user within the date range
    const dailyLogs = await prisma.dailyLog.findMany({
      where: {
        userId,
        date: {
          gte: `${year}-01-01`,
          lte: `${year}-12-31`,
        },
      },
    });
    
    // Get all spaced repetition items for the user
    const srItems = await prisma.spacedRepetitionData.findMany({
      where: {
        userId,
        dueDate: {
          gte: startDateStr,
          lte: endDateStr,
        }
      },
    });
    
    // Aggregate daily review data
    const dailyReviews: Record<string, number> = {};
    
    // Process daily logs
    dailyLogs.forEach((log) => {
      if (!dailyReviews[log.date]) {
        dailyReviews[log.date] = 0;
      }
      dailyReviews[log.date] += log.count;
    });
    
    return NextResponse.json({
      success: true,
      reviewStats: {
        dailyReviews,
        dueItems: srItems.map((item) => ({
          surahNo: item.surahNo,
          ayahNoSurah: item.ayahNoSurah,
          dueDate: item.dueDate,
          selectionType: item.selectionType,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching review stats:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching review stats" },
      { status: 500 }
    );
  }
} 