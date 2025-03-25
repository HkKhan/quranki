import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

// PATCH handler - Accept or decline a friend request
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { requestId, action } = await request.json();
    
    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }
    
    if (!action || !["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Valid action (accept or decline) is required" },
        { status: 400 }
      );
    }
    
    // Ensure the request exists and is addressed to this user
    const friendRequest = await prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        receiverId: userId,
        status: "pending"
      }
    });
    
    if (!friendRequest) {
      return NextResponse.json(
        { error: "Friend request not found or already processed" },
        { status: 404 }
      );
    }
    
    if (action === "accept") {
      // Update request status
      await prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: "accepted" }
      });
      
      // Create friendship
      const friendship = await prisma.friend.create({
        data: {
          user1Id: friendRequest.receiverId, // Current user
          user2Id: friendRequest.senderId    // Friend who sent the request
        }
      });
      
      return NextResponse.json({
        message: "Friend request accepted successfully",
        friendship
      });
    } else {
      // Decline the request
      await prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: "declined" }
      });
      
      return NextResponse.json({
        message: "Friend request declined"
      });
    }
    
  } catch (error) {
    console.error("Error processing friend request:", error);
    return NextResponse.json(
      { error: "Failed to process friend request" },
      { status: 500 }
    );
  }
}

// DELETE handler - Cancel a friend request that you sent
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { requestId } = await request.json();
    
    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }
    
    // Ensure the request exists and was sent by this user
    const friendRequest = await prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        senderId: userId,
        status: "pending"
      }
    });
    
    if (!friendRequest) {
      return NextResponse.json(
        { error: "Friend request not found" },
        { status: 404 }
      );
    }
    
    // Delete the request
    await prisma.friendRequest.delete({
      where: { id: requestId }
    });
    
    return NextResponse.json({
      message: "Friend request canceled successfully"
    });
    
  } catch (error) {
    console.error("Error canceling friend request:", error);
    return NextResponse.json(
      { error: "Failed to cancel friend request" },
      { status: 500 }
    );
  }
} 