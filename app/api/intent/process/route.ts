import { NextResponse } from "next/server";
import { processIntent } from "@/lib/services/intent-service";

// POST /api/intent/process
export async function POST(request: Request) {
  try {
    // Get intent from request body
    const body = await request.json();
    const { intent } = body;

    if (!intent || typeof intent !== "string") {
      return NextResponse.json(
        { success: false, error: "Intent is required and must be a string" },
        { status: 400 }
      );
    }

    // Process the intent using our AI service
    console.log(`Processing intent: "${intent}"`);
    const result = await processIntent(intent);

    // Return the processed intent
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error processing intent:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process intent",
        // Include more details in development
        ...(process.env.NODE_ENV === "development" && {
          stack: error.stack,
          details: error.details,
        }),
      },
      { status: 500 }
    );
  }
}
