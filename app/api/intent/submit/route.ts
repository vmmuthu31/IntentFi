import { NextResponse } from "next/server";
import { submitIntent } from "@/lib/services/blockchain-service";
import { IntentExecutionPlan } from "@/lib/services/intent-service";

// POST /api/intent/submit
export async function POST(request: Request) {
  try {
    // Get data from request body
    const body = await request.json();
    const { walletAddress, intentPlan, originalIntent } = body;

    // Validate the request
    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Wallet address is required and must be a string",
        },
        { status: 400 }
      );
    }

    if (!intentPlan || !intentPlan.steps || !Array.isArray(intentPlan.steps)) {
      return NextResponse.json(
        { success: false, error: "Valid intent plan is required" },
        { status: 400 }
      );
    }

    if (!originalIntent || typeof originalIntent !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Original intent is required and must be a string",
        },
        { status: 400 }
      );
    }

    // Submit the intent to the blockchain
    console.log(
      `Submitting intent from wallet ${walletAddress}: "${originalIntent}"`
    );
    const intentId = await submitIntent(
      walletAddress,
      intentPlan as IntentExecutionPlan,
      originalIntent
    );

    // Return the intent ID
    return NextResponse.json({
      success: true,
      data: {
        intentId,
        message: "Intent submitted successfully",
      },
    });
  } catch (error: any) {
    console.error("Error submitting intent to blockchain:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to submit intent to blockchain",
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
