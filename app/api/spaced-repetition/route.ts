import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const surahNo = searchParams.get("surahNo");
  const ayahNoSurah = searchParams.get("ayahNoSurah");

  try {
    if (surahNo && ayahNoSurah) {
      // Get specific SR data
      const srData = await prisma.spacedRepetitionData.findUnique({
        where: {
          userId_surahNo_ayahNoSurah: {
            userId: session.user.id,
            surahNo: parseInt(surahNo),
            ayahNoSurah: parseInt(ayahNoSurah),
          },
        },
      });
      return NextResponse.json({ srData });
    } else {
      // Get all SR data for the user
      const srData = await prisma.spacedRepetitionData.findMany({
        where: { userId: session.user.id },
      });
      return NextResponse.json({ srData });
    }
  } catch (error) {
    console.error("Error fetching SR data:", error);
    return NextResponse.json(
      { error: "Error fetching SR data" },
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
    const { surahNo, ayahNoSurah, interval, repetitions, easeFactor, dueDate, reviewDate, selectionType } = data;

    const srData = await prisma.spacedRepetitionData.upsert({
      where: {
        userId_surahNo_ayahNoSurah: {
          userId: session.user.id,
          surahNo,
          ayahNoSurah,
        },
      },
      update: {
        interval,
        repetitions,
        easeFactor,
        dueDate: new Date(dueDate),
        reviewDate,
        selectionType,
        lastReviewed: new Date(),
      },
      create: {
        userId: session.user.id,
        surahNo,
        ayahNoSurah,
        interval,
        repetitions,
        easeFactor,
        dueDate: new Date(dueDate),
        reviewDate,
        selectionType,
      },
    });

    return NextResponse.json({ srData });
  } catch (error) {
    console.error("Error saving SR data:", error);
    return NextResponse.json(
      { error: "Error saving SR data" },
      { status: 500 }
    );
  }
} 