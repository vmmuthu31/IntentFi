import { NextResponse } from "next/server";
import { borrow } from "@/lib/services/blockchain-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contractAddress, tokenAddress, amount } = body;
    
    if (!contractAddress || !tokenAddress || !amount) {
      return NextResponse.json({
        success: false,
        message: "Missing required parameters"
      }, { status: 400 });
    }
    
    const result = await borrow({
      body: { contractAddress, tokenAddress, amount }
    });
    
    return NextResponse.json({
      success: true,
      message: "Borrow successful",
      data: result
    });
  } catch (error) {
    console.error("Error in borrow:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to process borrow",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 