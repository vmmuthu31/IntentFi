import { NextResponse } from "next/server";
import { setTokenPrice } from "@/lib/services/integration";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chainId, token, price } = body;

    if (!chainId || !token || !price) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameters",
        },
        { status: 400 }
      );
    }

    const result = await setTokenPrice({
      chainId,
      token,
      price,
    });

    return NextResponse.json({
      success: true,
      message: "Set token price successful",
      data: result,
    });
  } catch (error) {
    console.error("Error in set token price:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process set token price",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
