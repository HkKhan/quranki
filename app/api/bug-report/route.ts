import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { prisma } from "@/lib/prisma";

// Function to generate a ticket number
function generateTicketNumber() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BUG-${timestamp.slice(-6)}${random}`;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be logged in to submit a bug report" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const description = formData.get("description") as string;

    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // Generate a unique ticket number
    const ticketNumber = generateTicketNumber();

    // Save to database
    const bug = await prisma.bug.create({
      data: {
        userId: session.user.id,
        description,
        ticketNumber,
        status: "open",
      },
    });

    return NextResponse.json({
      message: "Bug report submitted successfully",
      ticketNumber: bug.ticketNumber,
      note: "If you would like to add screenshots, please email them to contactquranki@gmail.com with your ticket number: " + bug.ticketNumber
    }, { status: 200 });

  } catch (error) {
    console.error("Error submitting bug report:", error);
    return NextResponse.json(
      { 
        error: "Failed to submit bug report",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 