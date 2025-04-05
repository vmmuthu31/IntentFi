import { NextRequest, NextResponse } from "next/server";
import { getUserIdentifier } from "@selfxyz/core";
import { ethers } from "ethers";
import abi from "@/artifacts/IdentityVerifier.json";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proof, publicSignals } = body;

    if (!proof || !publicSignals) {
      return NextResponse.json(
        { message: "Proof and publicSignals are required" },
        { status: 400 }
      );
    }

    console.log("Proof:", proof);
    console.log("Public signals:", publicSignals);

    const contractAddress = "0x792620B1F97608c9AE93E0f823F40f47Dd7E20D3";

    const address = await getUserIdentifier(publicSignals, "hex");
    console.log("Extracted address from verification result:", address);

    // Connect to Celo network
    const provider = new ethers.providers.JsonRpcProvider(
      "https://celo-alfajores.infura.io/v3/95c5fe3fe1504b01a8a1c9a3c428a49f"
    );
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    const contract = new ethers.Contract(contractAddress, abi, signer);

    try {
      const tx = await contract.verifySelfProof({
        a: proof.a,
        b: [
          [proof.b[0][1], proof.b[0][0]],
          [proof.b[1][1], proof.b[1][0]],
        ],
        c: proof.c,
        pubSignals: publicSignals,
      });
      await tx.wait();
      console.log("Successfully called verifySelfProof function");
      return NextResponse.json({
        status: "success",
        result: true,
        credentialSubject: {},
      });
    } catch (error) {
      console.error("Error calling verifySelfProof function:", error);
      return NextResponse.json(
        {
          status: "error",
          result: false,
          message: "Verification failed or date of birth not disclosed",
          details: {},
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error verifying proof:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Error verifying proof",
        result: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "success",
    message: "Self verification endpoint is online and working",
    timestamp: new Date().toISOString(),
  });
}

// For OPTIONS requests (needed for CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
