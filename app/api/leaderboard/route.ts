import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface LeaderboardEntry {
  userId: string;
  _sum: {
    count: number | null;
  };
}

// Store previous rankings to calculate position changes
let previousRankings: Map<string, number> = new Map();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "10");
    const sortBy = searchParams.get("sortBy") || "totalAyahs"; // Default sort by total ayahs
    const skip = (page - 1) * perPage;

    // Fetch all users first - this ensures we include users with no daily logs
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      }
    });

    // Get ayah counts for users who have dailyLogs
    const userAyahCounts = await prisma.dailyLog.groupBy({
      by: ["userId"],
      _sum: {
        count: true,
      },
    });

    // Create a map of userId to ayah count for quick lookup
    const ayahCountMap = new Map();
    userAyahCounts.forEach(entry => {
      ayahCountMap.set(entry.userId, entry._sum.count || 0);
    });

    // Process all users and calculate their stats
    let processedData = await Promise.all(
      allUsers.map(async (user) => {
        const userId = user.id;
        
        // Get user's daily logs for streak calculation
        const userLogs = await prisma.dailyLog.findMany({
          where: { userId },
          select: { date: true },
          distinct: ['date'],
          orderBy: { date: 'desc' },
        });
        
        // Calculate current streak
        let currentStreak = 0;
        let longestStreak = 0;
        
        // Check if any logs exist
        if (userLogs.length > 0) {
          // Start with 1 for the first day
          currentStreak = 1;
          longestStreak = 1;
          
          // Check if the most recent log is from today or yesterday
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          const mostRecentLogDate = new Date(userLogs[0].date);
          mostRecentLogDate.setHours(0, 0, 0, 0);
          
          // If most recent log is older than yesterday, current streak is broken
          if (mostRecentLogDate < yesterday) {
            currentStreak = 0;
          } else {
            // Calculate current streak by checking consecutive days
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
                // Break in streak
                break;
              }
            }
          }
        }

        return {
          userId,
          name: "Anonymous", // Always use "Anonymous" instead of real name
          totalAyahs: ayahCountMap.get(userId) || 0, // Get ayah count from map or default to 0
          currentStreak,
          longestStreak,
        };
      })
    );
    
    // Sort data based on the requested sort parameter
    if (sortBy === "currentStreak") {
      processedData.sort((a, b) => b.currentStreak - a.currentStreak);
    } else {
      // Default sort by total ayahs
      processedData.sort((a, b) => b.totalAyahs - a.totalAyahs);
    }
    
    // Calculate position changes
    const currentRankings = new Map();
    processedData.forEach((entry, index) => {
      currentRankings.set(entry.userId, index + 1);
    });
    
    // Add position change data
    processedData = processedData.map(entry => {
      const currentRank = currentRankings.get(entry.userId);
      const previousRank = previousRankings.get(entry.userId) || currentRank;
      const positionChange = previousRank - currentRank; // Positive = moved up, negative = moved down
      
      return {
        ...entry,
        positionChange,
      };
    });
    
    // Store current rankings for next time
    previousRankings = currentRankings;
    
    // Apply pagination
    const paginatedData = processedData.slice(skip, skip + perPage);

    return NextResponse.json({
      data: paginatedData.map(({ userId, ...rest }) => rest), // Remove userId from response
      metadata: {
        totalPages: Math.ceil(allUsers.length / perPage),
        currentPage: page,
        perPage,
        totalCount: allUsers.length,
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
