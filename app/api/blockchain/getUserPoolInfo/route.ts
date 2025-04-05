import { NextResponse } from "next/server";
import { integration } from "@/lib/services/integration";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chainId } = body;

    if (!chainId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameters",
        },
        { status: 400 }
      );
    }

    const result = await integration.getUserPoolInfo({
      chainId,
    });

    return NextResponse.json({
      success: true,
      message: "User pool info fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in getUserPoolInfo:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to get user pool info",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
