/**
 * Token Service
 *
 * This service provides token-related operations for IntentFi
 */

import { ethers } from "ethers";

// Types for the ethereum provider
export type Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  // Add other methods as needed
  [key: string]: unknown;
};

// Types
export interface GoatTokenBalance {
  token: string;
  symbol: string;
  amount: string;
  decimals: number;
  usdValue?: number;
}

export interface GoatSwapQuote {
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  expectedOutput: string;
  estimatedPriceImpact: string;
  routeDescription: string;
}

// Configuration for supported chains
const SUPPORTED_CHAINS = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  celo: 42220,
  celoAlfajores: 44787,
  rootstock: 31,
  sagaIFI: 2743859179913000,
};

/**
 * Get token balances for an address
 *
 * This implementation uses ethers.js directly to fetch token balances
 *
 * @param chainId The chain ID to fetch balances from
 * @param address The wallet address
 * @param provider The provider (window.ethereum or other provider)
 */
export const getTokenBalances = async (
  chainId: number,
  address: string,
  provider: Provider
): Promise<GoatTokenBalance[]> => {
  try {
    // Create ethers provider - need to cast to any due to ethers.js types
    const ethersProvider = new ethers.providers.Web3Provider(
      provider as ethers.providers.ExternalProvider
    );

    // Fetch standard ERC20 token balances
    const tokenAddresses = getTokenAddressesByChain(chainId);
    const results: GoatTokenBalance[] = [];

    // For each token, fetch balance using ethers
    for (const [symbol, tokenAddress] of Object.entries(tokenAddresses)) {
      try {
        // Define minimal ERC20 ABI
        const minimalAbi = [
          "function balanceOf(address owner) view returns (uint256)",
          "function decimals() view returns (uint8)",
          "function symbol() view returns (string)",
        ];

        // Create contract instance
        const contract = new ethers.Contract(
          tokenAddress,
          minimalAbi,
          ethersProvider
        );

        // Get token details
        const balance = await contract.balanceOf(address);
        const decimals = await contract.decimals();

        // Format balance
        const amount = ethers.utils.formatUnits(balance, decimals);

        // Add to results if balance > 0
        if (parseFloat(amount) > 0) {
          results.push({
            token: tokenAddress,
            symbol,
            amount,
            decimals,
            usdValue: 0, // Price fetching would be implemented separately
          });
        }
      } catch (error) {
        console.error(`Error fetching balance for ${symbol}:`, error);
      }
    }

    return results;
  } catch (error) {
    console.error("Error fetching token balances:", error);
    return [];
  }
};

/**
 * Get swap quotes (placeholder implementation)
 */
export const getSwapQuote = async (
  inputToken: string,
  outputToken: string,
  amount: string
): Promise<GoatSwapQuote> => {
  // This is a placeholder implementation
  return {
    inputToken,
    outputToken,
    inputAmount: amount,
    expectedOutput: "0",
    estimatedPriceImpact: "0",
    routeDescription: "Direct swap",
  };
};

/**
 * Execute a swap (placeholder implementation)
 */
export const executeSwap = async (): Promise<string> => {
  // This is a placeholder implementation
  return "0x0000000000000000000000000000000000000000000000000000000000000000";
};

/**
 * Get token addresses by chain ID
 */
function getTokenAddressesByChain(chainId: number): Record<string, string> {
  switch (chainId) {
    case SUPPORTED_CHAINS.ethereum:
      return {
        USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      };
    case SUPPORTED_CHAINS.polygon:
      return {
        USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
        WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      };
    case SUPPORTED_CHAINS.celo:
    case SUPPORTED_CHAINS.celoAlfajores:
      return {
        cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
        cEUR: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
      };
    case SUPPORTED_CHAINS.rootstock:
      return {
        DOC: "0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0",
      };
    default:
      return {};
  }
}
