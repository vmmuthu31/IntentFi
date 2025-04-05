import { NextResponse } from "next/server";
import { integration } from "@/lib/services/integration";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chainId, poolId } = body;

    if (!chainId || !poolId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameters",
        },
        { status: 400 }
      );
    }

    const result = await integration.emergencyWithdraw({
      chainId,
      poolId,
    });

    return NextResponse.json({
      success: true,
      message: "Emergency withdraw successful",
      data: result,
    });
  } catch (error) {
    console.error("Error in emergency withdraw:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process emergency withdraw",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
