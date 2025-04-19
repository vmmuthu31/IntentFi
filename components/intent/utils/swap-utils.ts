import { toast } from "sonner";
import { Web3Provider } from "./token-utils";

// Add Provider type like in goat-sdk-service.ts
type Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  [key: string]: unknown;
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

export const handleSwapTokens = async (
  integration: SwapIntegration,
  fromToken: string,
  toToken: string,
  amount: string,
  chainId: number,
  provider: Web3Provider,
  address: string | undefined,
  isConnected: boolean
): Promise<SwapResult> => {
  try {
    if (!isConnected || !address || !chainId) {
      return {
        success: false,
        message: "Wallet not connected. Please connect your wallet to proceed.",
      };
    }

    // First get a quote to show the user what they'll receive
    const quote = await integration.getSwapQuote({
      chainId,
      provider: provider as unknown as Provider,
      address,
      inputToken: fromToken,
      outputToken: toToken,
      amount,
    });

    toast.info(
      `Swapping ${amount} ${fromToken} for approximately ${quote.expectedOutput} ${toToken} (Price impact: ${quote.estimatedPriceImpact}%).`
    );

    // Execute the swap
    const txHash = await integration.executeSwap({
      chainId,
      provider: provider as unknown as Provider,
      address,
      inputToken: fromToken,
      outputToken: toToken,
      amount,
      slippage: 0.5,
    });

    toast.success(`Swap transaction submitted! TX Hash: ${txHash}`);
    return {
      success: true,
      message: `Successfully swapped ${amount} ${fromToken} for ${toToken}.`,
    };
  } catch (error) {
    console.error("Error swapping tokens:", error);
    let errorMessage = "Failed to swap tokens. Please try again.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    toast.error(errorMessage);
    return {
      success: false,
      message: errorMessage,
    };
  }
};
