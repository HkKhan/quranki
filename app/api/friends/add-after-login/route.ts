import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { inviterEmail } = await request.json();
    
    if (!inviterEmail) {
      return NextResponse.json(
        { error: "Inviter email is required" },
        { status: 400 }
      );
    }
    
    // Get current user's info
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true }
    });
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Check if the inviter email is not the same as the current user
    if (currentUser.email.toLowerCase() === inviterEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "You cannot add yourself as a friend" },
        { status: 400 }
      );
    }
    
    // Find the inviter by email
    const inviter = await prisma.user.findUnique({
      where: { email: inviterEmail.toLowerCase() }
    });
    
    if (!inviter) {
      return NextResponse.json(
        { error: "Inviter not found", notFound: true },
        { status: 404 }
      );
    }
    
    // Check if they are already friends
    const existingFriendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { user1Id: currentUser.id, user2Id: inviter.id },
          { user1Id: inviter.id, user2Id: currentUser.id }
        ]
      }
    });
    
    if (existingFriendship) {
      return NextResponse.json(
        { message: "You are already friends with this user", alreadyFriends: true },
        { status: 200 }
      );
    }
    
    // Check if there's already a pending request in either direction
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: currentUser.id, receiverId: inviter.id },
          { senderId: inviter.id, receiverId: currentUser.id }
        ]
      }
    });
    
    if (existingRequest) {
      // If there's already a request from the inviter to the current user, accept it
      if (existingRequest.senderId === inviter.id && existingRequest.receiverId === currentUser.id) {
        // Delete the request
        await prisma.friendRequest.delete({
          where: { id: existingRequest.id }
        });
        
        // Create friendship
        const friendship = await prisma.friend.create({
          data: {
            user1Id: currentUser.id,
            user2Id: inviter.id
          }
        });
        
        return NextResponse.json({
          message: "Friend request accepted successfully",
          friendship
        });
      } else {
        return NextResponse.json(
          { message: "Friend request already sent", alreadySent: true },
          { status: 200 }
        );
      }
    }
    
    // Create a new friendship directly (no request needed since this is from an invitation)
    const friendship = await prisma.friend.create({
      data: {
        user1Id: inviter.id,  // The inviter is user1
        user2Id: currentUser.id  // The current user is user2
      }
    });
    
    return NextResponse.json({
      message: "Friend added successfully",
      friendship
    });
    
  } catch (error) {
    console.error("Error adding friend after login:", error);
    return NextResponse.json(
      { error: "Failed to add friend" },
      { status: 500 }
    );
  }
} 