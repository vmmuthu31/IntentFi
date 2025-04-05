import { NextResponse } from "next/server";
import { storeIntent } from "@/lib/services/mongodb-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userAddress, description, chain, type, steps } = body;

    if (!userAddress || !description || !chain || !type || !steps) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: userAddress, description, chain, type, and steps are required" 
        },
        { status: 400 }
      );
    }

    const intentId = await storeIntent({
      userAddress,
      description,
      chain,
      type,
      steps
    });

    return NextResponse.json({
      success: true,
      data: { intentId }
    });
  } catch (error: unknown) {
    console.error("Error storing intent:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to store intent",
      },
      { status: 500 }
    );
  }
} 