import { NextResponse } from "next/server";
import { processIntent } from "@/lib/services/intent-service";

// POST /api/intent
export async function POST(request: Request) {
  try {
    // Get intent from request body
    const { intent } = await request.json();

    if (!intent || typeof intent !== "string") {
      return new NextResponse(
        JSON.stringify({ error: "Intent is required and must be a string" }),
        { status: 400 }
      );
    }

    // Process the intent using our service
    const result = await processIntent(intent);

    // Return the processed intent
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error processing intent:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to process intent" }),
      { status: 500 }
    );
  }
}
