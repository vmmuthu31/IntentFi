import { NextResponse } from "next/server";
import { processIntent } from "@/lib/services/intent-service";
import { storeIntent } from "@/lib/services/mongodb-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { intent, chainId, userAddress } = body;

    if (!intent || typeof intent !== "string") {
      return NextResponse.json(
        { success: false, error: "Intent is required and must be a string" },
        { status: 400 }
      );
    }

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: "User address is required" },
        { status: 400 }
      );
    }

    const result = await processIntent(intent, chainId);

    // Determine intent type based on the steps or content
    const intentType = determineIntentType(result.steps);

    // Store the intent in MongoDB
    await storeIntent({
      userAddress,
      description: intent,
      chain: getChainName(chainId),
      type: intentType,
      steps: result.steps
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error("Error processing intent:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process intent",
        ...(process.env.NODE_ENV === "development" && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 }
    );
  }
}

// Helper function to determine intent type based on steps
function determineIntentType(steps: Array<{description: string, chain: string}>): string {
  const description = steps.map(step => step.description.toLowerCase()).join(' ');
  
  if (description.includes('deposit') || description.includes('supply')) {
    return 'deposit';
  } else if (description.includes('withdraw')) {
    return 'withdraw';
  } else if (description.includes('borrow')) {
    return 'borrow';
  } else if (description.includes('repay')) {
    return 'repay';
  } else if (description.includes('swap') || description.includes('exchange')) {
    return 'swap';
  } else if (description.includes('stake')) {
    return 'stake';
  } else if (description.includes('unstake')) {
    return 'unstake';
  } else if (description.includes('claim')) {
    return 'claim';
  } else if (description.includes('transfer') || description.includes('send')) {
    return 'transfer';
  } else {
    return 'other';
  }
}

// Helper function to get chain name from chainId
function getChainName(chainId?: number): string {
  if (!chainId) return 'unknown';
  
  switch (chainId) {
    case 44787:
      return 'celoAlfajores';
    case 31337:
      return 'localhost';
    case 31:
      return 'rootstock';
    default:
      return `chain-${chainId}`;
  }
}
