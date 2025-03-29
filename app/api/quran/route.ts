import { type NextRequest, NextResponse } from "next/server";
import {
  getAyahsByJuz,
  getNextAyahs,
  getReviewAyahs,
  loadQuranData,
  getAllSurahs,
  getAyahsBySurah,
  getReviewAyahsBySurah,
  getSurahAyahCount,
  getPrevAyahs,
} from "@/lib/quran-data";
import { auth } from "@/app/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");
  const isGuestMode = searchParams.get("guest") === "true";

  try {
    // Get user session for authenticated routes
    const session = await auth();
    const userId = session?.user?.id;

    if (action === "load") {
      // Just load basic info to verify the data is available
      const data = await loadQuranData();
      return NextResponse.json({
        success: true,
        count: data.length,
        firstAyah: data[0],
        lastAyah: data[data.length - 1],
      });
    }

    if (action === "juz") {
      const juzParam = searchParams.get("juz");
      if (!juzParam) {
        return NextResponse.json(
          { success: false, error: "Missing juz parameter" },
          { status: 400 }
        );
      }

      const juzNumbers = juzParam.split(",").map((j) => Number.parseInt(j, 10));
      const ayahs = await getAyahsByJuz(juzNumbers);

      return NextResponse.json({ success: true, ayahs });
    }

    if (action === "surahs") {
      // Get all surahs info
      const surahs = await getAllSurahs();
      return NextResponse.json({ success: true, surahs });
    }

    if (action === "surahDetails") {
      // Get all surahs with their details
      const surahs = await getAllSurahs();

      // Add total ayahs for each surah
      const surahsWithDetails = await Promise.all(
        surahs.map(async (surah) => {
          const totalAyahs = await getSurahAyahCount(surah.surah_no);
          return {
            ...surah,
            total_ayahs: totalAyahs,
          };
        })
      );

      return NextResponse.json({ success: true, surahs: surahsWithDetails });
    }

    if (action === "surahInfo") {
      const surahNo = Number.parseInt(searchParams.get("surah") || "0", 10);
      if (!surahNo) {
        return NextResponse.json(
          { success: false, error: "Missing or invalid surah parameter" },
          { status: 400 }
        );
      }

      const surahs = await getAllSurahs();
      const surah = surahs.find((s) => s.surah_no === surahNo);

      if (!surah) {
        return NextResponse.json(
          { success: false, error: "Surah not found" },
          { status: 404 }
        );
      }

      const totalAyahs = await getSurahAyahCount(surahNo);

      return NextResponse.json({
        success: true,
        surah: {
          ...surah,
          total_ayahs: totalAyahs,
        },
      });
    }

    if (action === "surah") {
      const surahParam = searchParams.get("surah");
      if (!surahParam) {
        return NextResponse.json(
          { success: false, error: "Missing surah parameter" },
          { status: 400 }
        );
      }

      const surahNumbers = surahParam
        .split(",")
        .map((s) => Number.parseInt(s, 10));
      const ayahs = await getAyahsBySurah(surahNumbers);

      return NextResponse.json({ success: true, ayahs });
    }

    if (action === "surahAyahCount") {
      const surahNo = Number.parseInt(searchParams.get("surah") || "0", 10);
      if (!surahNo) {
        return NextResponse.json(
          { success: false, error: "Missing or invalid surah parameter" },
          { status: 400 }
        );
      }

      const count = await getSurahAyahCount(surahNo);
      return NextResponse.json({ success: true, count });
    }

    if (action === "reviewBySurah") {
      const surahParam = searchParams.get("surah");
      const countParam = searchParams.get("count") || "20";

      if (!surahParam) {
        return NextResponse.json(
          { success: false, error: "Missing surah parameter" },
          { status: 400 }
        );
      }

      // Check for user authentication - skip for guest mode
      if (!userId && !isGuestMode) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }

      const surahNumbers = surahParam
        .split(",")
        .map((s) => Number.parseInt(s, 10));
      const count = Number.parseInt(countParam, 10);

      // Use a fixed value for userId in guest mode
      const effectiveUserId = isGuestMode ? "guest" : userId;
      const reviewAyahs = await getReviewAyahsBySurah(
        surahNumbers,
        count,
        effectiveUserId as string
      );
      return NextResponse.json({ success: true, ayahs: reviewAyahs });
    }

    if (action === "next") {
      const surahNo = Number.parseInt(searchParams.get("surah") || "0", 10);
      const ayahNo = Number.parseInt(searchParams.get("ayah") || "0", 10);
      const count = Number.parseInt(searchParams.get("count") || "1", 10);

      if (!surahNo || !ayahNo) {
        return NextResponse.json(
          { success: false, error: "Missing surah or ayah parameter" },
          { status: 400 }
        );
      }

      const nextAyahs = await getNextAyahs(surahNo, ayahNo, count);
      return NextResponse.json({ success: true, ayahs: nextAyahs });
    }

    if (action === "prev") {
      const surahNo = Number.parseInt(searchParams.get("surah") || "0", 10);
      const ayahNo = Number.parseInt(searchParams.get("ayah") || "0", 10);
      const count = Number.parseInt(searchParams.get("count") || "1", 10);

      if (!surahNo || !ayahNo) {
        return NextResponse.json(
          { success: false, error: "Missing surah or ayah parameter" },
          { status: 400 }
        );
      }

      const prevAyahs = await getPrevAyahs(surahNo, ayahNo, count);
      return NextResponse.json({ success: true, ayahs: prevAyahs });
    }

    if (action === "review") {
      const juzParam = searchParams.get("juz");
      const countParam = searchParams.get("count") || "20";

      if (!juzParam) {
        return NextResponse.json(
          { success: false, error: "Missing juz parameter" },
          { status: 400 }
        );
      }

      // Check for user authentication - skip for guest mode
      if (!userId && !isGuestMode) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }

      const juzNumbers = juzParam.split(",").map((j) => Number.parseInt(j, 10));
      const count = Number.parseInt(countParam, 10);

      // Use a fixed value for userId in guest mode
      const effectiveUserId = isGuestMode ? "guest" : userId;
      const reviewAyahs = await getReviewAyahs(
        juzNumbers,
        count,
        effectiveUserId as string
      );
      return NextResponse.json({ success: true, ayahs: reviewAyahs });
    }

    if (action === "getPage") {
      try {
        const surahNo = Number(searchParams.get("surah"));
        const ayahNoSurah = Number(searchParams.get("ayah"));

        if (!surahNo || !ayahNoSurah) {
          return NextResponse.json({
            success: false,
            error: "Missing surah or ayah parameters",
          });
        }

        // Load quran data and find the page number for this ayah
        const quranData = await loadQuranData();
        const ayah = quranData.find(
          (a) => a.surah_no === surahNo && a.ayah_no_surah === ayahNoSurah
        );

        if (!ayah) {
          return NextResponse.json({
            success: false,
            error: "Ayah not found",
          });
        }

        // Check if we have matching page image files
        const possiblePages = [];

        // First, try to calculate page based on ayah_no_quran
        // For demo purposes, we're using a simple calculation
        // Quran has ~6236 ayahs and ~604 pages, so ~10 ayahs per page on average
        const calculatedPage = Math.floor((ayah.ayah_no_quran - 1) / 10) + 1;
        possiblePages.push(calculatedPage);

        // Also check for pages that match the ayah number directly
        // This is a fallback if we can't calculate the page correctly
        const possibleDirectPageMatch = surahNo * 10 + ayahNoSurah; // Just a heuristic
        if (possibleDirectPageMatch <= 604) {
          // Max Quran pages
          possiblePages.push(possibleDirectPageMatch);
        }

        // Return the first page we found that has an image in our img directory
        // For a real implementation, this would be replaced with a database lookup
        return NextResponse.json({
          success: true,
          page: possiblePages[0] || 1, // Default to page 1 if all else fails
        });
      } catch (error) {
        console.error("Error fetching page information:", error);
        return NextResponse.json({
          success: false,
          error: "Failed to fetch page information",
        });
      }
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in Quran API:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
