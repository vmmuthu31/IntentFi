import { NextResponse } from "next/server";
import { deploySmartAccount } from "@/lib/services/blockchain-service";

export async function POST() {
  try {
    console.log("Starting direct account deployment...");

    // Attempt deployment with maximum information
    console.log("Calling deploySmartAccount...");
    const result = await deploySmartAccount();

    console.log("Deployment result:", result);

    return NextResponse.json({
      success: !!result,
      message: result
        ? "Smart account deployed successfully"
        : "Failed to deploy smart account",
      deployed: result,
    });
  } catch (error) {
    console.error("Error deploying smart account:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to deploy smart account",
        error: error instanceof Error ? error.message : String(error),
        errorObject: JSON.stringify(error),
      },
      { status: 500 }
    );
  }
}
