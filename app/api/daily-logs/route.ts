import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  try {
    if (date) {
      // Get logs for a specific date
      const logs = await prisma.dailyLog.findMany({
        where: {
          userId: session.user.id,
          date,
        },
      });
      return NextResponse.json({ logs });
    } else {
      // Get all logs for the user
      const logs = await prisma.dailyLog.findMany({
        where: { userId: session.user.id },
      });
      return NextResponse.json({ logs });
    }
  } catch (error) {
    console.error("Error fetching daily logs:", error);
    return NextResponse.json(
      { error: "Error fetching daily logs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { date, ayahKey } = data;
    
    // Ensure we're using the date provided by the client
    // This ensures timezone consistency since the client creates the date in local timezone
    
    const log = await prisma.dailyLog.upsert({
      where: {
        userId_date_ayahKey: {
          userId: session.user.id,
          date,
          ayahKey,
        },
      },
      update: {
        count: { increment: 1 },
      },
      create: {
        userId: session.user.id,
        date,
        ayahKey,
        count: 1,
      },
    });

    return NextResponse.json({ log });
  } catch (error) {
    console.error("Error saving daily log:", error);
    return NextResponse.json(
      { error: "Error saving daily log" },
      { status: 500 }
    );
  }
} 