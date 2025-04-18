import { NextResponse } from "next/server";
import { integration } from "@/lib/services/integration";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chainId } = body;

    try {
      const result = await integration.approve({ chainId });

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
