import { NextResponse } from "next/server";
import { withdraw } from "@/lib/services/integration";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chainId, token, amount } = body;

    if (!chainId || !token || !amount) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameters",
        },
        { status: 400 }
      );
    }

    const result = await withdraw({
      chainId,
      token,
      amount,
    });

    return NextResponse.json({
      success: true,
      message: "Withdrawal successful",
      data: result,
    });
  } catch (error) {
    console.error("Error in withdraw:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process withdrawal",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
