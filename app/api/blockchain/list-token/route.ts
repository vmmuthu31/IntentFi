import { NextResponse } from "next/server";
import { listToken } from "@/lib/services/integration";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chainId, tokenAddress } = body;

    if (!chainId || !tokenAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameters",
        },
        { status: 400 }
      );
    }

    const result = await listToken({
      chainId,
      tokenAddress,
    });

    return NextResponse.json({
      success: true,
      message: "List token successful",
      data: result,
    });
  } catch (error) {
    console.error("Error in list token:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process list token",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
