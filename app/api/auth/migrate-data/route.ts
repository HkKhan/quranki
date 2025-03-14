import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
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
    
    // Safely parse request body
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return NextResponse.json(
          { success: false, message: "Empty request body" },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { success: false, message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    
    // Handle empty request body
    if (!body) {
      return NextResponse.json(
        { success: true, message: "No data to migrate" },
        { status: 200 }
      );
    }
    
    // Extract data from the request body
    const { 
      quranSettings, 
      spacedRepetitionData, 
      dailyLogs 
    } = body;
    
    const migrationResults = {
      settingsMigrated: false,
      spacedRepetitionMigrated: false,
      dailyLogsMigrated: false
    };
    
    // Process Quran settings
    if (quranSettings) {
      await prisma.quranReviewSettings.upsert({
        where: { userId },
        update: {
          selectedJuzaa: quranSettings.selectedJuzaa ?? [],
          selectedSurahs: quranSettings.selectedSurahs ?? [],
          selectionType: quranSettings.selectionType ?? "juzaa",
          ayahsAfter: quranSettings.ayahsAfter ?? 2,
          promptsPerSession: quranSettings.promptsPerSession ?? 20,
        },
        create: {
          userId,
          selectedJuzaa: quranSettings.selectedJuzaa ?? [],
          selectedSurahs: quranSettings.selectedSurahs ?? [],
          selectionType: quranSettings.selectionType ?? "juzaa",
          ayahsAfter: quranSettings.ayahsAfter ?? 2,
          promptsPerSession: quranSettings.promptsPerSession ?? 20,
        },
      });
      migrationResults.settingsMigrated = true;
    }
    
    // Process spaced repetition data
    if (spacedRepetitionData && Array.isArray(spacedRepetitionData) && spacedRepetitionData.length > 0) {
      // Delete existing data first to avoid conflicts
      await prisma.spacedRepetitionData.deleteMany({
        where: { userId },
      });
      
      // Insert new data
      for (const item of spacedRepetitionData) {
        await prisma.spacedRepetitionData.create({
          data: {
            userId,
            surahNo: item.surahNo,
            ayahNoSurah: item.ayahNoSurah,
            interval: item.interval ?? 1,
            repetitions: item.repetitions ?? 0,
            easeFactor: item.easeFactor ?? 2.5,
            lastReviewed: new Date(item.lastReviewed || Date.now()),
            dueDate: new Date(item.dueDate || Date.now()),
            reviewDate: item.reviewDate ?? null,
            selectionType: item.selectionType ?? "juzaa",
          },
        });
      }
      migrationResults.spacedRepetitionMigrated = true;
    }
    
    // Process daily logs
    if (dailyLogs && Array.isArray(dailyLogs) && dailyLogs.length > 0) {
      // Delete existing logs first to avoid conflicts
      await prisma.dailyLog.deleteMany({
        where: { userId },
      });
      
      // Insert new logs
      for (const log of dailyLogs) {
        await prisma.dailyLog.create({
          data: {
            userId,
            date: log.date,
            ayahKey: log.ayahKey,
            count: log.count ?? 1,
          },
        });
      }
      migrationResults.dailyLogsMigrated = true;
    }
    
    return NextResponse.json(
      { 
        success: true, 
        message: "Data migrated successfully",
        results: migrationResults
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Data migration error:", error);
    return NextResponse.json(
      { success: false, message: "Error migrating data" },
      { status: 500 }
    );
  }
} 