import { NextResponse } from "next/server";
import { getUserIntents } from "@/lib/services/mongodb-service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userAddress = url.searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: "User address is required" },
        { status: 400 }
      );
    }

    const intents = await getUserIntents(userAddress);

    return NextResponse.json({
      success: true,
      data: intents,
    });
  } catch (error: unknown) {
    console.error("Error retrieving user intents:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to retrieve user intents",
      },
      { status: 500 }
    );
  }
} 