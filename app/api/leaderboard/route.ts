import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface LeaderboardEntry {
  userId: string;
  _sum: {
    count: number | null;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "10");
    const skip = (page - 1) * perPage;

    // Get total count first
    const totalCount = await prisma.dailyLog.groupBy({
      by: ["userId"],
      _count: true,
    });

    // Use any type to avoid type mismatch with the interface
    const leaderboardData = await prisma.dailyLog.groupBy({
      by: ["userId"],
      _sum: {
        count: true,
      },
      orderBy: {
        _sum: {
          count: "desc",
        },
      },
      skip,
      take: perPage,
    });

    // Fetch user details for each userId and calculate streaks
    const leaderboard = await Promise.all(
      leaderboardData.map(async (entry: any) => {
        const user = await prisma.user.findUnique({
          where: { id: entry.userId },
          select: {
            name: true,
            email: true,
          },
        });
        
        // Get user's daily logs for streak calculation
        const userLogs = await prisma.dailyLog.findMany({
          where: { userId: entry.userId },
          select: { date: true },
          distinct: ['date'],
          orderBy: { date: 'desc' },
        });
        
        // Calculate longest streak
        let currentStreak = 1;
        let longestStreak = 1;
        
        if (userLogs.length > 1) {
          for (let i = 0; i < userLogs.length - 1; i++) {
            const currentDate = new Date(userLogs[i].date);
            const nextDate = new Date(userLogs[i + 1].date);
            
            // Check if dates are consecutive
            const diffTime = Math.abs(currentDate.getTime() - nextDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
              currentStreak++;
              longestStreak = Math.max(longestStreak, currentStreak);
            } else {
              currentStreak = 1;
            }
          }
        }

        return {
          name: "Anonymous", // Always use "Anonymous" instead of real name
          totalAyahs: entry._sum.count || 0,
          longestStreak: longestStreak,
        };
      })
    );

    return NextResponse.json({
      data: leaderboard,
      metadata: {
        totalPages: Math.ceil(totalCount.length / perPage),
        currentPage: page,
        perPage,
        totalCount: totalCount.length,
      },
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard data" },
      { status: 500 }
    );
  }
}
