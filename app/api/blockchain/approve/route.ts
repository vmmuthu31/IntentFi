import { NextResponse } from "next/server";
import { approve, listSmartAccounts } from "@/lib/services/blockchain-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contractAddress, spenderAddress, allowanceAmount, smartAccountAddress } = body;
    
    if (!contractAddress || !spenderAddress || !allowanceAmount) {
      return NextResponse.json({
        success: false,
        message: "Missing required parameters"
      }, { status: 400 });
    }
    
    const result = await approve({
      body: { 
        contractAddress, 
        spenderAddress, 
        allowanceAmount,
        smartAccountAddress // Optional: specific smart account to use
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "Approval transaction successful",
      data: result
    });
  } catch (error) {
    console.error("Error in approve:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to process approval",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Add endpoint to list smart accounts
export async function GET() {
  try {
    const accounts = await listSmartAccounts();
    return NextResponse.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "Failed to list smart accounts",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 