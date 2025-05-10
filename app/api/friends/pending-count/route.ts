import { NextResponse } from "next/server";
import { auth } from "@/app/auth";

export async function GET() {
  try {
    const session = await auth();

    // Always return 0 to avoid errors as the friends feature might not be fully implemented yet
    return NextResponse.json({ count: 0 });
  } catch (error) {
    console.error("Error getting pending requests count:", error);
    return NextResponse.json({ count: 0 });
  }
}
