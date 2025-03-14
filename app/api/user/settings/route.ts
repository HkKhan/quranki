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
    
    // Fetch user settings from the database
    const settings = await prisma.quranReviewSettings.findUnique({
      where: { userId },
    });
    
    if (!settings) {
      return NextResponse.json(
        { message: "Settings not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { settings },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return NextResponse.json(
      { message: "Error fetching user settings" },
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
    
    // Update or create user settings
    const settings = await prisma.quranReviewSettings.upsert({
      where: { userId },
      update: {
        selectedJuzaa: body.selectedJuzaa || [],
        selectedSurahs: body.selectedSurahs || [],
        selectionType: body.selectionType || "juzaa",
        ayahsAfter: body.ayahsAfter || 2,
        promptsPerSession: body.promptsPerSession || 20,
      },
      create: {
        userId,
        selectedJuzaa: body.selectedJuzaa || [],
        selectedSurahs: body.selectedSurahs || [],
        selectionType: body.selectionType || "juzaa",
        ayahsAfter: body.ayahsAfter || 2,
        promptsPerSession: body.promptsPerSession || 20,
      },
    });
    
    return NextResponse.json(
      { settings },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user settings:", error);
    return NextResponse.json(
      { message: "Error updating user settings" },
      { status: 500 }
    );
  }
} 