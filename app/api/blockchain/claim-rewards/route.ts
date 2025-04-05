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

    const result = await integration.claimRewards({
      chainId,
      poolId,
    });

    return NextResponse.json({
      success: true,
      message: "Rewards claimed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in claim rewards:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process claim rewards",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
