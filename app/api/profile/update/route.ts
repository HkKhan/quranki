import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user || !session.user.id) {
      console.error('Profile update failed: User not authenticated');
      return NextResponse.json(
        { error: 'You must be logged in to update your profile' },
        { status: 401 }
      );
    }
    
    const data = await request.json();
    const { name } = data;
    // Validate name
    if (!name || name.trim() === '') {
      console.error('Profile update failed: Empty name provided');
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      );
    }
    
    try {
      // Update the user's profile
      const updatedUser = await prisma.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          name: name.trim(),
        },
      });
      
      return NextResponse.json({ 
        success: true, 
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
        }
      });
    } catch (dbError) {
      console.error('Database error updating profile:', dbError);
      return NextResponse.json(
        { error: 'Database error while updating profile' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 