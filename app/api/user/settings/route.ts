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
        { success: false, message: "Unauthorized", settings: null },
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
        { success: false, message: "Settings not found", settings: null },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: true, settings },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching user settings", settings: null },
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
        { success: false, message: "Unauthorized", settings: null },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Safely parse the request body
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return NextResponse.json(
          { success: false, message: "Empty request body", settings: null },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { success: false, message: "Invalid JSON in request body", settings: null },
        { status: 400 }
      );
    }
    
    // Ensure body is not null or undefined
    if (!body) {
      return NextResponse.json(
        { success: false, message: "Missing request body", settings: null },
        { status: 400 }
      );
    }
    
    // Update or create user settings
    const settings = await prisma.quranReviewSettings.upsert({
      where: { userId },
      update: {
        selectedJuzaa: Array.isArray(body.selectedJuzaa) ? body.selectedJuzaa : [],
        selectedSurahs: Array.isArray(body.selectedSurahs) ? body.selectedSurahs : [],
        selectionType: body.selectionType || "juzaa",
        ayahsAfter: typeof body.ayahsAfter === 'number' ? body.ayahsAfter : 2,
        promptsPerSession: typeof body.promptsPerSession === 'number' ? body.promptsPerSession : 20,
      },
      create: {
        userId,
        selectedJuzaa: Array.isArray(body.selectedJuzaa) ? body.selectedJuzaa : [],
        selectedSurahs: Array.isArray(body.selectedSurahs) ? body.selectedSurahs : [],
        selectionType: body.selectionType || "juzaa",
        ayahsAfter: typeof body.ayahsAfter === 'number' ? body.ayahsAfter : 2,
        promptsPerSession: typeof body.promptsPerSession === 'number' ? body.promptsPerSession : 20,
      },
    });
    
    return NextResponse.json(
      { success: true, settings },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user settings:", error);
    return NextResponse.json(
      { success: false, message: "Error updating user settings", settings: null },
      { status: 500 }
    );
  }
} 