import { NextResponse } from "next/server";
import { integration } from "@/lib/services/integration";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chainId, poolId, amount } = body;

    if (!chainId || poolId === undefined || amount === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameters",
        },
        { status: 400 }
      );
    }

    const result = await integration.stake({
      chainId,
      poolId,
      amount,
    });

    return NextResponse.json({
      success: true,
      message: "Stake successful",
      data: result,
    });
  } catch (error) {
    console.error("Error in stake:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to stake",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
