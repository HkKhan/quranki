import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  invitedBy: z.string().email('Invalid inviter email').optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = userSchema.parse(json);

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Create the user
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        password: hashedPassword,
      },
    });

    // Handle invitation if provided
    if (body.invitedBy) {
      try {
        const inviter = await prisma.user.findUnique({
          where: { email: body.invitedBy.toLowerCase() },
        });

        if (inviter) {
          // Create friendship between the users
          await prisma.friend.create({
            data: {
              user1Id: inviter.id,
              user2Id: user.id,
            },
          });
        }
      } catch (friendError) {
        console.error('Error creating friendship:', friendError);
        // Don't fail registration if friendship creation fails
      }
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { user: userWithoutPassword, message: 'User created successfully' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request data', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 