import { NextResponse } from "next/server";
import { integration } from "@/lib/services/integration";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chainId, token, amount } = body;

    if (!chainId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameters",
        },
        { status: 400 }
      );
    }

    const result = await integration.deposit({
      chainId,
      token,
      amount,
    });

    return NextResponse.json({
      success: true,
      allowance: result,
    });
  } catch (error) {
    console.error("Error in checkAllowance:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to check allowance",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
