import { toast } from "sonner";
import { Web3Provider } from "./token-utils";

// Import type from integration
import { integration } from "@/lib/services/integration";
import { Provider } from "@/lib/services/goat-sdk-service";
type IntegrationType = typeof integration;

/**
 * Adapter function to convert Web3Provider to Provider
 * This ensures type compatibility between the two provider types
 */
const adaptProvider = (web3Provider: Web3Provider): Provider => {
  if (!web3Provider || typeof web3Provider.request !== "function") {
    // Create a compatible provider with the required request method
    return {
      request: () => {
        console.error("Provider not properly initialized");
        return Promise.reject(new Error("Provider not properly initialized"));
      },
      // Copy any other properties from the original provider
      ...web3Provider,
    };
  }

  // Return a compatible provider object
  return {
    // Ensure the request method has the correct type signature
    request: (args) => {
      // Make TypeScript happy with the possibly undefined request method
      const requestMethod = web3Provider.request;
      if (!requestMethod) {
        return Promise.reject(
          new Error("Provider request method is undefined")
        );
      }
      return requestMethod(args);
    },
    // Include all other properties from the original provider
    ...web3Provider,
  };
};

// Integration interface for swap functionality
export interface SwapIntegration {
  getSwapQuote: (params: {
    chainId: number;
    provider: Provider;
    address: string;
    inputToken: string;
    outputToken: string;
    amount: string;
  }) => Promise<{
    expectedOutput: string;
    estimatedPriceImpact: string;
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    routeDescription: string;
  }>;
  executeSwap: (params: {
    chainId: number;
    provider: Provider;
    address: string;
    inputToken: string;
    outputToken: string;
    amount: string;
    slippage: number;
  }) => Promise<string>;
}

export interface SwapResult {
  success: boolean;
  message: string;
}

/**
 * Handle swap tokens using GOAT SDK
 */
export const handleSwapTokens = async (
  integration: IntegrationType,
  fromToken: string,
  toToken: string,
  amount: string,
  chainId: number,
  provider: Web3Provider,
  address: string,
  isConnected: boolean
): Promise<{ success: boolean; message: string }> => {
  if (!isConnected) {
    return {
      success: false,
      message: "Please connect your wallet to swap tokens",
    };
  }

  try {
    // Adapt the provider to the expected type
    const adaptedProvider = adaptProvider(provider);

    // Get a quote first
    const quote = await integration.getSwapQuote({
      chainId,
      provider: adaptedProvider,
      address,
      inputToken: fromToken,
      outputToken: toToken,
      amount,
    });

    // Show toast with quote info
    toast.success(
      `Quote: ${amount} ${fromToken} ≈ ${quote.expectedOutput} ${toToken}`
    );

    // Execute the swap
    const result = await integration.executeSwap({
      chainId,
      provider: adaptedProvider,
      address,
      inputToken: fromToken,
      outputToken: toToken,
      amount,
    });

    if (result.success) {
      return {
        success: true,
        message: `Successfully swapped ${amount} ${fromToken} for approximately ${quote.expectedOutput} ${toToken}`,
      };
    } else {
      throw new Error("Swap transaction failed");
    }
  } catch (error) {
    console.error("Swap error:", error);
    return {
      success: false,
      message: `Failed to swap tokens: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
};
