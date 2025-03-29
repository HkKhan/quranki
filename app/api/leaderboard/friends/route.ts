import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    const url = new URL(request.url);
    const sortBy = url.searchParams.get("sortBy") || "currentStreak";
    
    // Get all friends of the current user
    const friendsAsUser1 = await prisma.friend.findMany({
      where: { user1Id: userId },
      select: { user2Id: true }
    });
    
    const friendsAsUser2 = await prisma.friend.findMany({
      where: { user2Id: userId },
      select: { user1Id: true }
    });
    
    // Extract friend IDs
    const friendIds = [
      ...friendsAsUser1.map(f => f.user2Id),
      ...friendsAsUser2.map(f => f.user1Id)
    ];
    
    // Add current user to the list
    friendIds.push(userId);
    
    // Get leaderboard data for friends
    const users = await prisma.user.findMany({
      where: {
        id: { in: friendIds }
      },
      select: {
        id: true,
        name: true,
        email: true,
        dailyLogs: {
          select: {
            userId: true,
            date: true,
            count: true
          }
        }
      }
    });
    
    // Process data to calculate streaks and total ayahs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const friendsLeaderboardData = users.map(user => {
      // Group logs by date
      const logsByDate = user.dailyLogs.reduce((acc, log) => {
        const date = log.date;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(log);
        return acc;
      }, {} as Record<string, typeof user.dailyLogs>);
      
      // Calculate streak
      const dateKeys = Object.keys(logsByDate).sort((a, b) => 
        new Date(b).getTime() - new Date(a).getTime()
      );
      
      let currentStreak = 0;
      if (dateKeys.length > 0) {
        const todayStr = today.toISOString().split('T')[0];
        const yesterdayStr = new Date(today.getTime() - 86400000)
          .toISOString()
          .split('T')[0];
        
        // Check if user has logs today or yesterday to maintain streak
        const hasRecentActivity = dateKeys.includes(todayStr) || dateKeys.includes(yesterdayStr);
        
        if (hasRecentActivity) {
          currentStreak = 1; // Start with 1 for today/yesterday
          
          // Sort dates in ascending order for streak calculation
          const sortedDates = dateKeys
            .map(dateStr => new Date(dateStr))
            .sort((a, b) => a.getTime() - b.getTime());
          
          // Find the latest consecutive dates
          for (let i = sortedDates.length - 2; i >= 0; i--) {
            const curr = sortedDates[i];
            const next = sortedDates[i + 1];
            
            // Check if dates are consecutive
            const diffTime = next.getTime() - curr.getTime();
            const diffDays = diffTime / (1000 * 3600 * 24);
            
            if (diffDays === 1) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
      }
      
      // Calculate total ayahs reviewed
      const totalAyahs = user.dailyLogs.reduce((sum, log) => sum + log.count, 0);
      
      return {
        id: user.id,
        name: user.name || user.email.split('@')[0],
        totalAyahs,
        currentStreak,
        isCurrentUser: user.id === userId
      };
    });
    
    // Sort the leaderboard data
    const sortedData = friendsLeaderboardData.sort((a, b) => {
      if (sortBy === "totalAyahs") {
        return b.totalAyahs - a.totalAyahs;
      } else {
        // Sort by streak first, then by total ayahs if streak is the same
        return b.currentStreak !== a.currentStreak
          ? b.currentStreak - a.currentStreak
          : b.totalAyahs - a.totalAyahs;
      }
    });
    
    return NextResponse.json({
      data: sortedData,
      metadata: {
        totalCount: sortedData.length
      }
    });
    
  } catch (error) {
    console.error("Error fetching friends leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch friends leaderboard" },
      { status: 500 }
    );
  }
} 