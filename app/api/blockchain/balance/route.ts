import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    const chainIdParam = searchParams.get("chainId");

    if (!token || !chainIdParam) {
      return NextResponse.json(
        { error: "token and chainId are required query parameters" },
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

    console.log("chainId", chainId);
    console.log("token", token);

    return NextResponse.json({
      success: true,
      balance: "100",
    });
  } catch (error) {
    console.error("Error getting token balance:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get token balance",
      },
      { status: 500 }
    );
  }
}
