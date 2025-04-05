import { NextResponse } from "next/server";
import {
    approve,
} from "@/lib/services/integration";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contractAddress, spenderAddress, allowanceAmount } = body;

    if (!contractAddress || !spenderAddress || !allowanceAmount) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameters",
        },
        { status: 400 }
      );
    }




    // Attempt to approve with detailed error handling
    try {
      const result = await approve({
        body: {
          contractAddress,
          spenderAddress,
          allowanceAmount,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Approval transaction successful",
        data: result,
      });
    } catch (approveError) {
      console.error("Error during approval:", approveError);

      // Check if error is about account not being deployed
      if (
        approveError instanceof Error &&
        approveError.message.includes("not deployed")
      ) {
        console.log("Smart account not deployed, attempting deployment...");

        try {
          // Try to deploy the account
          const deployed = await deploySmartAccount();

          if (deployed) {
            // Retry the approval operation
            const result = await approve({
              body: {
                contractAddress,
                spenderAddress,
                allowanceAmount,
              },
            });

            return NextResponse.json({
              success: true,
              message: "Account deployed and approval successful",
              data: result,
            });
          } else {
            return NextResponse.json(
              {
                success: false,
                message:
                  "Failed to deploy account after initial approval failure",
                error: "Deployment failed",
              },
              { status: 500 }
            );
          }
        } catch (deployError) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Failed to deploy account after initial approval failure",
              error:
                deployError instanceof Error
                  ? deployError.message
                  : String(deployError),
            },
            { status: 500 }
          );
        }
      }

      // For other errors, return them directly
      if (
        approveError instanceof Error &&
        approveError.message.includes("Smart Account has already been deployed")
      ) {
        console.log(
          "Account is already deployed but factory parameters were included"
        );

        // Try again with a force parameter
        try {
          console.log("Retrying approve with special handling...");
          const result = await approve({
            body: {
              contractAddress,
              spenderAddress,
              allowanceAmount,
              forceDeployed: true,
            },
          });

          return NextResponse.json({
            success: true,
            message: "Approval successful after handling deployment mismatch",
            data: result,
          });
        } catch (finalError) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Failed to process approval even after handling deployment status",
              error:
                finalError instanceof Error
                  ? finalError.message
                  : String(finalError),
            },
            { status: 500 }
          );
        }
      }

      return NextResponse.json(
        {
          success: false,
          message: "Failed to process approval",
          error:
            approveError instanceof Error
              ? approveError.message
              : String(approveError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in approve route:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process approval request",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Add endpoint to list smart accounts
export async function GET() {
  try {
    const accounts = await listSmartAccounts();
    return NextResponse.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to list smart accounts",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
