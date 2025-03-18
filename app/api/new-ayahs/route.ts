import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAyahsByJuz, getAyahsBySurah } from "@/lib/quran-data";

// Extended type for QuranReviewSettings that includes newAyahsPerDay
interface QuranSettings {
  id: string;
  userId: string;
  selectedJuzaa: number[];
  selectedSurahs: number[];
  selectionType: "juzaa" | "surah";
  ayahsAfter: number;
  promptsPerSession: number;
  newAyahsPerDay: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET() {
  try {
    const session = await getServerAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user settings
    const settingsData = await prisma.quranReviewSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settingsData) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    // Cast settings to our extended type
    const settings = settingsData as unknown as QuranSettings;

    // Get all ayahs from the selected content using the helper functions
    let selectedAyahs = [];

    if (settings.selectionType === "juzaa") {
      // Get ayahs for selected juzaa
      selectedAyahs = await getAyahsByJuz(settings.selectedJuzaa);
    } else {
      // Get ayahs for selected surahs
      selectedAyahs = await getAyahsBySurah(settings.selectedSurahs);
    }

    // Get all ayahs that have been reviewed at least once
    const reviewedAyahs = await prisma.spacedRepetitionData.findMany({
      where: {
        userId: session.user.id,
        repetitions: { gt: 0 },
      },
      select: {
        surahNo: true,
        ayahNoSurah: true,
      },
    });

    // Create a set of reviewed ayahs for efficient lookup
    const reviewedSet = new Set(
      reviewedAyahs.map((ayah) => `${ayah.surahNo}-${ayah.ayahNoSurah}`)
    );

    // Count available new ayahs
    const availableNewAyahs = selectedAyahs.filter(
      (ayah) => !reviewedSet.has(`${ayah.surah_no}-${ayah.ayah_no_surah}`)
    ).length;

    // Calculate how many new ayahs to show today
    const newAyahsToShow = Math.min(
      availableNewAyahs,
      settings.newAyahsPerDay || 5
    );

    return NextResponse.json({
      success: true,
      availableNewAyahs,
      newAyahsToShow,
    });
  } catch (error) {
    console.error("Error getting new ayahs:", error);
    return NextResponse.json(
      {
        error: "Failed to get new ayahs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
