import { type NextRequest, NextResponse } from "next/server"
import { getAyahsByJuz, getNextAyahs, getReviewAyahs, loadQuranData } from "@/lib/quran-data"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get("action")

  try {
    if (action === "load") {
      // Just load basic info to verify the data is available
      const data = await loadQuranData()
      return NextResponse.json({
        success: true,
        count: data.length,
        firstAyah: data[0],
        lastAyah: data[data.length - 1],
      })
    }

    if (action === "juz") {
      const juzParam = searchParams.get("juz")
      if (!juzParam) {
        return NextResponse.json({ success: false, error: "Missing juz parameter" }, { status: 400 })
      }

      const juzNumbers = juzParam.split(",").map((j) => Number.parseInt(j, 10))
      const ayahs = await getAyahsByJuz(juzNumbers)

      return NextResponse.json({ success: true, ayahs })
    }

    if (action === "next") {
      const surahNo = Number.parseInt(searchParams.get("surah") || "0", 10)
      const ayahNo = Number.parseInt(searchParams.get("ayah") || "0", 10)
      const count = Number.parseInt(searchParams.get("count") || "1", 10)

      if (!surahNo || !ayahNo) {
        return NextResponse.json({ success: false, error: "Missing surah or ayah parameter" }, { status: 400 })
      }

      const nextAyahs = await getNextAyahs(surahNo, ayahNo, count)
      return NextResponse.json({ success: true, ayahs: nextAyahs })
    }

    if (action === "review") {
      const juzParam = searchParams.get("juz")
      const countParam = searchParams.get("count") || "20"

      if (!juzParam) {
        return NextResponse.json({ success: false, error: "Missing juz parameter" }, { status: 400 })
      }

      const juzNumbers = juzParam.split(",").map((j) => Number.parseInt(j, 10))
      const count = Number.parseInt(countParam, 10)

      const reviewAyahs = await getReviewAyahs(juzNumbers, count)
      return NextResponse.json({ success: true, ayahs: reviewAyahs })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in Quran API:", error)
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}

