import { NextApiRequest, NextApiResponse } from "next";
import { getUserIdentifier } from "@selfxyz/core";
import { ethers } from "ethers";
import abi from "@/artifacts/IdentityVerifier.json";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const { proof, publicSignals } = req.body;

      if (!proof || !publicSignals) {
        return res
          .status(400)
          .json({ message: "Proof and publicSignals are required" });
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
        res.status(200).json({
          status: "success",
          result: true,
          credentialSubject: {},
        });
      } catch (error) {
        console.error("Error calling verifySelfProof function:", error);
        res.status(400).json({
          status: "error",
          result: false,
          message: "Verification failed or date of birth not disclosed",
          details: {},
        });
        throw error;
      }
    } catch (error) {
      console.error("Error verifying proof:", error);
      return res.status(500).json({
        status: "error",
        message: "Error verifying proof",
        result: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
