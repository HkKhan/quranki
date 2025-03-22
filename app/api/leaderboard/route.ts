import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/app/auth";

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
    // Get the current authenticated user, if any
    const session = await auth();
    const currentUserId = session?.user?.id;
    
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
        const isCurrentUser = userId === currentUserId;
        
        // Get user's daily logs for streak calculation
        const userLogs = await prisma.dailyLog.findMany({
          where: { userId },
          select: { date: true },
          distinct: ['date'],
          orderBy: { date: 'desc' },
        });
        
        // Calculate streak using the same algorithm as the dashboard
        let currentStreak = 0;
        
        // Convert userLogs to just dates and sort them
        const sortedDates = userLogs.map(log => log.date).sort((a, b) => b.localeCompare(a)); // Sort newest to oldest
        
        if (sortedDates.length > 0) {
          // Check if user has reviewed today or yesterday to maintain streak
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]; // Yesterday in YYYY-MM-DD
          
          const mostRecentDate = sortedDates[0];
          let hasActiveStreak = mostRecentDate === today || mostRecentDate === yesterday;
          
          if (hasActiveStreak) {
            currentStreak = 1; // Start with 1 for the most recent day
            
            // Check for consecutive days
            let currentDateObj = new Date(mostRecentDate + "T00:00:00Z");
            
            // Start from the second date (index 1) since we've already counted the most recent
            for (let i = 1; i < sortedDates.length; i++) {
              const dateObj = new Date(sortedDates[i] + "T00:00:00Z");
              const daysDiff = Math.round(
                (currentDateObj.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24)
              );
              
              if (daysDiff === 1) {
                // Dates are consecutive
                currentStreak++;
                currentDateObj = dateObj;
              } else if (daysDiff === 0) {
                // Same day, continue checking without incrementing streak
                continue;
              } else {
                // Streak is broken
                break;
              }
            }
          }
        }

        return {
          userId,
          // Use real name for the current user, "Anonymous" for everyone else
          name: isCurrentUser ? (user.name || "You") : "Anonymous",
          totalAyahs: ayahCountMap.get(userId) || 0, // Get ayah count from map or default to 0
          currentStreak,
          isCurrentUser, // Flag to identify if this entry belongs to the current user
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
