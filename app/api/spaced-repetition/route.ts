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
    
    // Support filtering by surah, ayah, or due status
    const surahNo = searchParams.get("surahNo") ? parseInt(searchParams.get("surahNo")!) : undefined;
    const ayahNoSurah = searchParams.get("ayahNoSurah") ? parseInt(searchParams.get("ayahNoSurah")!) : undefined;
    const isDue = searchParams.get("isDue");
    
    // Build the where clause based on filter parameters
    let whereClause: any = { userId };
    
    if (surahNo !== undefined) {
      whereClause.surahNo = surahNo;
    }
    
    if (ayahNoSurah !== undefined) {
      whereClause.ayahNoSurah = ayahNoSurah;
    }
    
    if (isDue === "true") {
      whereClause.dueDate = {
        lte: new Date()
      };
    }
    
    // Fetch spaced repetition data
    const spacedRepetitionData = await prisma.spacedRepetitionData.findMany({
      where: whereClause,
      orderBy: {
        dueDate: "asc"
      }
    });
    
    return NextResponse.json(
      { success: true, spacedRepetitionData },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching spaced repetition data:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching spaced repetition data" },
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
    const body = await request.json();
    
    const { 
      surahNo, 
      ayahNoSurah, 
      interval, 
      repetitions, 
      easeFactor, 
      lastReviewed, 
      dueDate, 
      reviewDate,
      selectionType 
    } = body;
    
    if (!surahNo || !ayahNoSurah) {
      return NextResponse.json(
        { success: false, message: "Surah number and ayah number are required" },
        { status: 400 }
      );
    }
    
    // Upsert spaced repetition data (create or update)
    const srData = await prisma.spacedRepetitionData.upsert({
      where: {
        userId_surahNo_ayahNoSurah: {
          userId,
          surahNo,
          ayahNoSurah
        }
      },
      update: {
        interval: interval || 1,
        repetitions: repetitions || 0,
        easeFactor: easeFactor || 2.5,
        lastReviewed: lastReviewed ? new Date(lastReviewed) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        reviewDate,
        selectionType: selectionType || "juzaa"
      },
      create: {
        userId,
        surahNo,
        ayahNoSurah,
        interval: interval || 1,
        repetitions: repetitions || 0,
        easeFactor: easeFactor || 2.5,
        lastReviewed: lastReviewed ? new Date(lastReviewed) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        reviewDate,
        selectionType: selectionType || "juzaa"
      }
    });
    
    // Note: We've removed the daily log upsert here to prevent double counting
    // The recordDailyReview function in the client-side code already handles this
    
    return NextResponse.json(
      { success: true, data: srData },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving spaced repetition data:", error);
    return NextResponse.json(
      { success: false, message: "Error saving spaced repetition data" },
      { status: 500 }
    );
  }
} 