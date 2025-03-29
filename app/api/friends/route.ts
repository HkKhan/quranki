import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

// GET handler - Get all friends and friend requests for the current user
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get all accepted friend connections
    const friendsAsUser1 = await prisma.friend.findMany({
      where: { user1Id: userId },
      include: { 
        user2: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            lastActive: true
          }
        }
      }
    });
    
    const friendsAsUser2 = await prisma.friend.findMany({
      where: { user2Id: userId },
      include: { 
        user1: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            lastActive: true
          }
        }
      }
    });
    
    // Get pending friend requests (received)
    const pendingRequests = await prisma.friendRequest.findMany({
      where: { 
        receiverId: userId,
        status: "pending"
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });
    
    // Get sent friend requests
    const sentRequests = await prisma.friendRequest.findMany({
      where: { 
        senderId: userId,
        status: "pending"
      },
      include: {
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });
    
    // Format friends list
    const friends = [
      ...friendsAsUser1.map((friend: any) => ({
        id: friend.user2.id,
        name: friend.user2.name,
        email: friend.user2.email,
        image: friend.user2.image,
        lastActive: friend.user2.lastActive,
        friendshipId: friend.id
      })),
      ...friendsAsUser2.map((friend: any) => ({
        id: friend.user1.id,
        name: friend.user1.name,
        email: friend.user1.email,
        image: friend.user1.image,
        lastActive: friend.user1.lastActive,
        friendshipId: friend.id
      }))
    ];
    
    return NextResponse.json({
      friends,
      pendingRequests,
      sentRequests
    });
    
  } catch (error) {
    console.error("Error getting friends:", error);
    return NextResponse.json(
      { error: "Failed to get friends" },
      { status: 500 }
    );
  }
}

// POST handler - Send a friend request by email
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    
    // Check if user is trying to add themselves
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });
    
    if (currentUser?.email === email) {
      return NextResponse.json(
        { error: "You cannot add yourself as a friend" },
        { status: 400 }
      );
    }
    
    // Find the user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!userToAdd) {
      return NextResponse.json(
        { error: "User not found", notFound: true },
        { status: 404 }
      );
    }
    
    // Check if they are already friends
    const existingFriendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: userToAdd.id },
          { user1Id: userToAdd.id, user2Id: userId }
        ]
      }
    });
    
    if (existingFriendship) {
      return NextResponse.json(
        { error: "You are already friends with this user" },
        { status: 400 }
      );
    }
    
    // Check if there's already a pending request in either direction
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: userToAdd.id },
          { senderId: userToAdd.id, receiverId: userId }
        ]
      }
    });
    
    if (existingRequest) {
      // If there's an existing request from the other user to this user, accept it
      if (existingRequest.senderId === userToAdd.id && existingRequest.receiverId === userId) {
        // Delete the existing request instead of updating it
        await prisma.friendRequest.delete({
          where: { id: existingRequest.id }
        });
        
        // Create a friendship
        const newFriendship = await prisma.friend.create({
          data: {
            user1Id: userId,
            user2Id: userToAdd.id
          }
        });
        
        return NextResponse.json({
          message: "Friend request accepted automatically",
          friendship: newFriendship
        });
      }
      
      return NextResponse.json(
        { error: "A friend request already exists between you and this user" },
        { status: 400 }
      );
    }
    
    // Create a new friend request
    const friendRequest = await prisma.friendRequest.create({
      data: {
        senderId: userId,
        receiverId: userToAdd.id,
        status: "pending"
      }
    });
    
    return NextResponse.json({
      message: "Friend request sent successfully",
      request: friendRequest
    });
    
  } catch (error) {
    console.error("Error sending friend request:", error);
    return NextResponse.json(
      { error: "Failed to send friend request" },
      { status: 500 }
    );
  }
}

// DELETE handler - Remove a friend
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { friendshipId } = await request.json();
    
    if (!friendshipId) {
      return NextResponse.json(
        { error: "Friendship ID is required" },
        { status: 400 }
      );
    }
    
    // Verify the friendship belongs to the current user
    const friendship = await prisma.friend.findFirst({
      where: {
        id: friendshipId,
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      }
    });
    
    if (!friendship) {
      return NextResponse.json(
        { error: "Friendship not found" },
        { status: 404 }
      );
    }
    
    // Get the other user's ID
    const otherUserId = friendship.user1Id === userId 
      ? friendship.user2Id 
      : friendship.user1Id;
    
    // Delete the friendship
    await prisma.friend.delete({
      where: { id: friendshipId }
    });
    
    // Also delete any friend requests between these users
    await prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      }
    });
    
    return NextResponse.json({
      message: "Friend removed successfully"
    });
    
  } catch (error) {
    console.error("Error removing friend:", error);
    return NextResponse.json(
      { error: "Failed to remove friend" },
      { status: 500 }
    );
  }
} 