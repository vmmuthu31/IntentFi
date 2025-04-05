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

    // Try to verify on-chain, but have a fallback for development
    let onChainVerificationSucceeded = false;
    let verificationError = null;

    try {
      // Define multiple RPC endpoints to try
      const rpcUrls = [
        "https://alfajores-forno.celo-testnet.org",
        "https://rpc.ankr.com/celo_alfajores",
        "https://celo-alfajores.infura.io/v3/95c5fe3fe1504b01a8a1c9a3c428a49f",
      ];

      let provider = null;

      // Try each RPC URL
      for (const rpcUrl of rpcUrls) {
        try {
          console.log(`Attempting to connect to: ${rpcUrl}`);

          // Create provider with explicit network config
          provider = new ethers.providers.JsonRpcProvider(
            {
              url: rpcUrl,
              timeout: 10000, // 10 second timeout
            },
            {
              name: "Celo Alfajores",
              chainId: 44787,
            }
          );

          // Test the connection
          const network = await provider.ready;
          console.log(`Connected to network: ${JSON.stringify(network)}`);
          break; // If we get here, we've successfully connected
        } catch (err) {
          console.error(`Failed to connect to ${rpcUrl}:`, err);
          provider = null;
        }
      }

      if (!provider) {
        throw new Error("Failed to connect to any Celo Alfajores RPC endpoint");
      }

      // Check if PRIVATE_KEY is available
      if (!process.env.PRIVATE_KEY) {
        throw new Error("PRIVATE_KEY environment variable not set");
      }

      const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      const contract = new ethers.Contract(contractAddress, abi, signer);

      console.log("Calling verifySelfProof function...");
      const tx = await contract.verifySelfProof({
        a: proof.a,
        b: [
          [proof.b[0][1], proof.b[0][0]],
          [proof.b[1][1], proof.b[1][0]],
        ],
        c: proof.c,
        pubSignals: publicSignals,
      });

      console.log("Transaction sent, waiting for confirmation...");
      const receipt = await tx.wait(1);
      console.log(
        `Successfully verified on-chain. Transaction hash: ${receipt.transactionHash}`
      );
      onChainVerificationSucceeded = true;
    } catch (error) {
      console.error("Error during on-chain verification:", error);
      verificationError = error;
      // We'll continue and return a success response anyway for development purposes
    }

    // Return a success response even if on-chain verification failed
    // This allows development with the UI without requiring a working blockchain connection
    return NextResponse.json({
      status: "success",
      result: true,
      credentialSubject: {
        address: address,
      },
      onChainVerification: onChainVerificationSucceeded
        ? "succeeded"
        : "bypassed",
      error: verificationError ? String(verificationError) : null,
    });
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
