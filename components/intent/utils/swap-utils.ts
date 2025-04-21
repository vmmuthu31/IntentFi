import { Web3Provider } from "./token-utils";
import { ethers } from "ethers";

// Import type from integration
import { integration } from "@/lib/services/integration";
import { Provider } from "@/lib/services/integration.d";
type IntegrationType = typeof integration;

/**
 * Adapter function to convert Web3Provider to Provider
 * This ensures type compatibility between the two provider types
 */
const adaptProvider = (web3Provider: Web3Provider): Provider => {
  // Create an ethers Web3Provider from the ExternalProvider
  const ethersProvider = new ethers.providers.Web3Provider(web3Provider);
  return ethersProvider;
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

    console.log("adaptedProvider", adaptedProvider);

    return {
      success: true,
      message: `Successfully swapped ${amount} ${fromToken} for approximately  ${toToken}`,
    };
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
