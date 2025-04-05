import { NextResponse } from "next/server";
import { getAllowance } from "@/lib/services/blockchain-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contractAddress, ownerAddress, spenderAddress } = body;

    if (!contractAddress || !ownerAddress || !spenderAddress) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameters",
        },
        { status: 400 }
      );
    }

    const result = await getAllowance({
      body: { contractAddress, ownerAddress, spenderAddress },
    });

    return NextResponse.json({
      success: true,
      allowance: result.allowance,
    });
  } catch (error) {
    console.error("Error in getAllowance:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to get allowance",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
