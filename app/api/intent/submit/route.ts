import { NextResponse } from "next/server";
import { submitIntent } from "@/lib/services/blockchain-service";
import { IntentExecutionPlan } from "@/lib/services/intent-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, intentPlan, originalIntent } = body;

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

    const intentId = await submitIntent(
      walletAddress,
      intentPlan as IntentExecutionPlan,
      originalIntent
    );

    return NextResponse.json({
      success: true,
      data: {
        intentId,
        message: "Intent submitted successfully",
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Error submitting intent to blockchain:", err);

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to submit intent to blockchain",
        ...(process.env.NODE_ENV === "development" && {
          stack: err.stack,
          details:
            "details" in err
              ? (err as { details: unknown }).details
              : undefined,
        }),
      },
      { status: 500 }
    );
  }
}
