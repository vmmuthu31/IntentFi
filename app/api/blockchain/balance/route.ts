// app/api/blockchain/balance/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getTokenPrice } from "@/lib/services/blockchain-service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    const chainIdParam = searchParams.get("chainId");
    const contractAddress = searchParams.get("contractAddress");
    if (!token || !chainIdParam || !contractAddress) {
      return NextResponse.json(
        {
          error:
            "token, chainId and contractAddress are required query parameters",
        },
        { status: 400 }
      );
    }

    const chainId = parseInt(chainIdParam);

    if (isNaN(chainId)) {
      return NextResponse.json(
        { error: "chainId must be a valid number" },
        { status: 400 }
      );
    }

    const price = await getTokenPrice(token, chainId, contractAddress);

    return NextResponse.json({
      success: true,
      price,
    });
  } catch (error) {
    console.error("Error getting token price:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get token price",
      },
      { status: 500 }
    );
  }
}
