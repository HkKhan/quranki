import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

// Update the user's last active timestamp
export async function POST() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Update the lastActive timestamp
    await prisma.user.update({
      where: { id: userId },
      data: { lastActive: new Date() }
    });
    
    return NextResponse.json({ 
      message: "Status updated successfully" 
    });
    
  } catch (error) {
    console.error("Error updating user status:", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
} 