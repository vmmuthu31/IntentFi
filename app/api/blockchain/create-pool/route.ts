import { NextResponse } from "next/server";
import { integration } from "@/lib/services/integration";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chainId, token } = body;

    if (!chainId || !token) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameters",
        },
        { status: 400 }
      );
    }
    const rewardPerSecond = 5;

    const startTime = Math.floor(Date.now() / 1000) + 5 * 60;
    const endTime = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;

    const result = await integration.createPool({
      chainId,
      stakingToken: token,
      rewardPerSecond: rewardPerSecond.toString(),
      startTime: startTime.toString(),
      endTime: endTime.toString(),
    });

    return NextResponse.json({
      success: true,
      message: "Pool created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in create pool:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process create pool",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
