import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

// MongoDB connection string from environment variable
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = "intentfi";
const COLLECTION_NAME = "verifiedUsers";

// Connect to MongoDB
async function connectToDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    return { client, db };
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);

    // Fallback to in-memory storage if MongoDB connection fails
    return { client, db: null };
  }
}

// In-memory fallback if MongoDB connection fails
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

    console.log(`GET verification request for address: ${address}`);

    if (!address) {
      return NextResponse.json(
        { success: false, message: "Address parameter is required" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    let isVerified = false;
    const normalizedAddress = address.toLowerCase();

    // Force verification for test addresses
    if (
      normalizedAddress === "0x1234567890123456789012345678901234567890" ||
      normalizedAddress === "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    ) {
      console.log(
        `Using test address: ${normalizedAddress} - setting isVerified=true`
      );
      isVerified = true;
    } else {
      // Try to check verification status in MongoDB
      try {
        const { client, db } = await connectToDatabase();

        if (db) {
          const collection = db.collection(COLLECTION_NAME);
          const user = await collection.findOne({ address: normalizedAddress });
          isVerified = !!user;
          console.log(
            `MongoDB verification check for ${normalizedAddress}: ${
              isVerified ? "Verified" : "Not verified"
            }`
          );
        } else {
          // Fallback to in-memory storage
          isVerified = VERIFIED_ADDRESSES.has(normalizedAddress);
          console.log(
            `In-memory verification check for ${normalizedAddress}: ${
              isVerified ? "Verified" : "Not verified"
            }`
          );
        }

        await client.close();
      } catch (dbError) {
        console.error("Database error:", dbError);
        // Fallback to in-memory storage
        isVerified = VERIFIED_ADDRESSES.has(normalizedAddress);
      }
    }

    return NextResponse.json(
      {
        success: true,
        isVerified,
        message: isVerified
          ? "User is KYC verified"
          : "User has not completed KYC verification",
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error in verification endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to check verification status",
        error: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, isVerified, verificationData } = body;

    if (!address) {
      return NextResponse.json(
        { success: false, message: "Address is required" },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();
    let success = false;

    // Try to update verification status in MongoDB
    try {
      const { client, db } = await connectToDatabase();

      if (db) {
        const collection = db.collection(COLLECTION_NAME);

        if (isVerified) {
          // Add or update the user's verification status
          const result = await collection.updateOne(
            { address: normalizedAddress },
            {
              $set: {
                address: normalizedAddress,
                verificationData,
                verifiedAt: new Date(),
                updatedAt: new Date(),
              },
            },
            { upsert: true }
          );

          success = result.acknowledged;
        } else {
          // Remove verification if status is set to false
          const result = await collection.deleteOne({
            address: normalizedAddress,
          });
          success = result.acknowledged;
        }
      } else {
        // Fallback to in-memory storage
        if (isVerified) {
          VERIFIED_ADDRESSES.add(normalizedAddress);
        } else {
          VERIFIED_ADDRESSES.delete(normalizedAddress);
        }
        success = true;
      }

      await client.close();
    } catch (dbError) {
      console.error("Database error:", dbError);
      // Fallback to in-memory storage
      if (isVerified) {
        VERIFIED_ADDRESSES.add(normalizedAddress);
      } else {
        VERIFIED_ADDRESSES.delete(normalizedAddress);
      }
      success = true;
    }

    return NextResponse.json({
      success,
      message: `Verification status updated for ${address}`,
      isVerified: isVerified,
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

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Cache-Control",
      "Access-Control-Max-Age": "86400",
    },
  });
}
