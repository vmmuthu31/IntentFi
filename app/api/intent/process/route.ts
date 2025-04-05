import { NextResponse } from "next/server";
import { processIntent } from "@/lib/services/intent-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { intent, chainId } = body;

    if (!intent || typeof intent !== "string") {
      return NextResponse.json(
        { success: false, error: "Intent is required and must be a string" },
        { status: 400 }
      );
    }

    const result = await processIntent(intent, chainId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error("Error processing intent:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process intent",
        ...(process.env.NODE_ENV === "development" && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 }
    );
  }
}
