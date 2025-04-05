import { NextResponse } from "next/server";

// In production, this would connect to a MongoDB database
// For now, we'll use an in-memory store to simulate verified addresses
const VERIFIED_ADDRESSES = new Set([
  // Add some test addresses
  "0x1234567890123456789012345678901234567890",
  "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
]);

export async function GET(request: Request) {
  try {
    // Get user address from query parameter
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { success: false, message: "Address parameter is required" },
        { status: 400 }
      );
    }

    // Check if user is verified (in production, this would query MongoDB)
    const isVerified = VERIFIED_ADDRESSES.has(address.toLowerCase());

    return NextResponse.json({
      success: true,
      isVerified,
      message: isVerified
        ? "User is KYC verified"
        : "User has not completed KYC verification",
    });
  } catch (error) {
    console.error("Error in verification endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to check verification status",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Create or update verification status
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, isVerified } = body;

    if (!address) {
      return NextResponse.json(
        { success: false, message: "Address is required" },
        { status: 400 }
      );
    }

    // Update verification status
    // In production, this would update a MongoDB collection
    if (isVerified) {
      VERIFIED_ADDRESSES.add(address.toLowerCase());
    } else {
      VERIFIED_ADDRESSES.delete(address.toLowerCase());
    }

    return NextResponse.json({
      success: true,
      message: `Verification status updated for ${address}`,
      isVerified: VERIFIED_ADDRESSES.has(address.toLowerCase()),
    });
  } catch (error) {
    console.error("Error updating verification status:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update verification status",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
