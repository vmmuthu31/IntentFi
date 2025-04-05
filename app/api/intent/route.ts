import { NextResponse } from "next/server";
import { processIntent } from "@/lib/services/intent-service";

export async function POST(request: Request) {
  try {
    const { intent } = await request.json();

    if (!intent || typeof intent !== "string") {
      return new NextResponse(
        JSON.stringify({ error: "Intent is required and must be a string" }),
        { status: 400 }
      );
    }

    const result = await processIntent(intent);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error processing intent:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to process intent" }),
      { status: 500 }
    );
  }
}
