import { NextApiRequest, NextApiResponse } from "next";
import { kv } from "@vercel/kv";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { userId, options } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (!options) {
      return res.status(400).json({ message: "Options are required" });
    }

    console.log("Saving options for user:", userId, options);
    // Store the options in Vercel KV with a 30-minute expiration
    await kv.set(userId, JSON.stringify(options), { ex: 1800 }); // 1800 seconds = 30 minutes

    return res.status(200).json({ message: "Options saved successfully" });
  } catch (error) {
    console.error("Error saving options:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
