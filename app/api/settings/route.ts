import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await prisma.quranReviewSettings.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Error fetching settings" },
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
    const { selectedJuzaa, selectedSurahs, selectionType, ayahsAfter, promptsPerSession } = data;

    const settings = await prisma.quranReviewSettings.upsert({
      where: { userId: session.user.id },
      update: {
        selectedJuzaa,
        selectedSurahs,
        selectionType,
        ayahsAfter,
        promptsPerSession,
      },
      create: {
        userId: session.user.id,
        selectedJuzaa,
        selectedSurahs,
        selectionType,
        ayahsAfter,
        promptsPerSession,
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Error saving settings" },
      { status: 500 }
    );
  }
} 