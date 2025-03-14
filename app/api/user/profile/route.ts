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
        { success: false, message: "Unauthorized", user: null },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Fetch user profile from the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found", user: null },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: true, user },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching user profile", user: null },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get the current user session
    const session = await getServerAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", user: null },
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
          { success: false, message: "Empty request body", user: null },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { success: false, message: "Invalid JSON in request body", user: null },
        { status: 400 }
      );
    }
    
    // Ensure body is not null or undefined
    if (!body) {
      return NextResponse.json(
        { success: false, message: "Missing request body", user: null },
        { status: 400 }
      );
    }
    
    // Update user profile with validation
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: typeof body.name === 'string' ? body.name : undefined,
        // Note: We don't allow updating email or password here
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });
    
    return NextResponse.json(
      { success: true, user },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { success: false, message: "Error updating user profile", user: null },
      { status: 500 }
    );
  }
} 