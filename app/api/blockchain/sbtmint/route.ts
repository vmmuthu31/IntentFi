import { NextResponse } from "next/server";
import { sbtmint } from "@/lib/services/blockchain-service";

export async function POST() {
  try {
    // Since sbtmint doesn't take parameters in your implementation
    const result = await sbtmint();
    
    return NextResponse.json({
      success: true,
      message: "SBT mint transaction successful",
      data: result
    });
  } catch (error) {
    console.error("Error in SBT mint:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to process SBT mint transaction",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 