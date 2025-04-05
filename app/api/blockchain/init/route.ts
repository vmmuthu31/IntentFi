import { NextResponse } from "next/server";
import { initClients } from "@/lib/services/blockchain-service";

export async function GET() {
  try {
    const initialized = await initClients();
    
    if (initialized) {
      return NextResponse.json({
        success: true,
        message: "Blockchain clients initialized successfully"
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Failed to initialize blockchain clients"
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error initializing blockchain clients:", error);
    return NextResponse.json({
      success: false,
      message: "Error initializing blockchain clients",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 