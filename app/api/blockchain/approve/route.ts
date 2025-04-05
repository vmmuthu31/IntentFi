import { NextResponse } from "next/server";
import { approve } from "@/lib/services/integration";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contractAddress, spenderAddress, allowanceAmount } = body;

    if (!contractAddress || !spenderAddress || !allowanceAmount) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameters",
        },
        { status: 400 }
      );
    }
    try {
      const result = await approve({
        body: {
          contractAddress,
          spenderAddress,
          allowanceAmount,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Approval transaction successful",
        data: result,
      });
    } catch (approveError) {
      console.error("Error during approval:", approveError);

      return NextResponse.json(
        {
          success: false,
          message: "Approval transaction failed",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in approve route:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to approve",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
