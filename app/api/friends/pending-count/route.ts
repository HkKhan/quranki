import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get count of pending friend requests (received)
    const pendingRequestsCount = await prisma.friendRequest.count({
      where: { 
        receiverId: userId,
        status: "pending"
      }
    });
    
    return NextResponse.json({
      count: pendingRequestsCount
    });
    
  } catch (error) {
    console.error("Error getting pending requests count:", error);
    return NextResponse.json(
      { error: "Failed to get pending requests count" },
      { status: 500 }
    );
  }
} 