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
    const perPage = parseInt(searchParams.get("perPage") || "25");
    const skip = (page - 1) * perPage;

    // Get total count first
    const totalCount = await prisma.dailyLog.groupBy({
      by: ["userId"],
      _count: true,
    });

    const leaderboardData: LeaderboardEntry[] = await prisma.dailyLog.groupBy({
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

    // Fetch user details for each userId
    const leaderboard = await Promise.all(
      leaderboardData.map(async (entry) => {
        const user = await prisma.user.findUnique({
          where: { id: entry.userId },
          select: {
            name: true,
            email: true,
          },
        });

        return {
          name: user?.name || user?.email?.split("@")[0] || "Anonymous",
          totalAyahs: entry._sum.count || 0,
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
