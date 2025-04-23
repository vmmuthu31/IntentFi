/**
 * Integration Service
 *
 * This service provides integration with blockchain networks using viem
 * It handles transaction signing and other blockchain operations
 */

import { BigNumber, ethers } from "ethers";
import { Chain, createPublicClient, http } from "viem";
import { celoAlfajores, rootstockTestnet } from "viem/chains";
import { erc20 } from "@goat-sdk/plugin-erc20";
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { WalletClientBase, type Balance } from "@goat-sdk/core";
import { type Chain as CoreChain } from "@goat-sdk/core";

// Define OnChainTool interface since it's not exported from the SDK
interface OnChainTool {
  name: string;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

// Import all GOAT SDK services
import {
  getPricePrediction,
  getTokenInsights,
  getTokenInfo,
  bridgeTokens,
  resolveEnsName,
  addBalancerLiquidity,
  getPoolInformation as sdkGetPoolInformation,
} from "./goat-sdk-service";

// Export GOAT SDK services for use in other modules
export {
  getPricePrediction,
  getTokenInsights,
  getTokenInfo,
  bridgeTokens,
  resolveEnsName,
  addBalancerLiquidity,
  sdkGetPoolInformation as getPoolInformation,
};

interface NetworkConfig {
  chainId: number;
  chain: Chain;
  name: string;
  network: string;
  rpcUrl: string;
  nativeCurrency?: {
    decimals: number;
    name: string;
    symbol: string;
  };
}

// Define the token structure
export interface TokenDefinition {
  decimals: number;
  symbol: string;
  name: string;
  chains: {
    [chainId: number]: {
      contractAddress: `0x${string}`;
    };
  };
}

const isBrowser = (): boolean => typeof window !== "undefined";

const { ethereum } = isBrowser() ? window : { ethereum: null };

// Define the Web3Provider type
export type Web3Provider = ethers.providers.ExternalProvider;

// Define the Provider type
export type Provider = ethers.providers.Provider;

// Network configurations
const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  "31": {
    chainId: 31,
    chain: rootstockTestnet,
    name: "Rootstock Testnet",
    network: "rootstock",
    rpcUrl: "https://public-node.testnet.rsk.co",
  },
  "44787": {
    chainId: 44787,
    chain: celoAlfajores,
    name: "celoAlfajores",
    network: "celo-alfajores",
    rpcUrl: "https://alfajores-forno.celo-testnet.org",
    nativeCurrency: {
      decimals: 18,
      name: "CELO",
      symbol: "CELO",
    },
  },
};

// Get the network configuration based on the current chain
const getNetworkConfig = async (): Promise<NetworkConfig> => {
  try {
    // Default to Celo Alfajores if no wallet is connected
    if (!ethereum) {
      console.log("No wallet detected, defaulting to Celo Alfajores network");
      return NETWORK_CONFIGS["44787"];
    }

    // Try to get the network from the wallet
    try {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const network = await provider.getNetwork();
      const chainId = network.chainId.toString();

      if (NETWORK_CONFIGS[chainId]) {
        console.log(`Using network config for chain ID ${chainId}`);
        return NETWORK_CONFIGS[chainId];
      } else {
        console.warn(
          `Network with chain ID ${chainId} is not supported, defaulting to Celo Alfajores`
        );
        return NETWORK_CONFIGS["44787"];
      }
    } catch (error) {
      console.error("Error detecting network from wallet:", error);
      console.log("Defaulting to Celo Alfajores network");
      return NETWORK_CONFIGS["44787"];
    }
  } catch (error) {
    console.error("Unexpected error in getNetworkConfig:", error);
    // Always have a fallback
    return {
      chainId: 44787,
      chain: celoAlfajores,
      name: "celoAlfajores",
      network: "celo-alfajores",
      rpcUrl: "https://alfajores-forno.celo-testnet.org",
      nativeCurrency: {
        decimals: 18,
        name: "CELO",
        symbol: "CELO",
      },
    };
  }
};

/**
 * Format units to human-readable form
 * @param {string|BigNumber} value Value to format
 * @param {number} decimals Number of decimals
 * @returns {string} Formatted value
 */
export const formatUnits = (
  value: string | BigNumber,
  decimals = 18
): string => {
  return ethers.utils.formatUnits(value, decimals);
};

/**
 * Parse units from human-readable form to wei
 * @param {string} value Value to parse
 * @param {number} decimals Number of decimals
 * @returns {BigNumber} Parsed value
 */
export const parseUnits = (value: string, decimals = 18): BigNumber => {
  return ethers.utils.parseUnits(value.toString(), decimals);
};

// Create a viem-based adapter for our wallet
const createWalletAdapter = async () => {
  const networkConfig = await getNetworkConfig();

  // Create a public client for the network
  const publicClient = createPublicClient({
    chain: networkConfig.chain,
    transport: http(networkConfig.rpcUrl),
  });

  // If no wallet is connected, use a read-only client
  if (!ethereum) {
    console.log("No wallet connected, creating read-only client");

    const readOnlyAdapter: WalletClientBase = {
      getAddress: () => {
        return "0x0000000000000000000000000000000000000000"; // Zero address for read-only
      },
      getChain: () => {
        return {
          id: networkConfig.chainId,
          name: networkConfig.name.toLowerCase(),
          type: "evm",
        } as CoreChain;
      },
      signMessage: async () => {
        throw new Error("Cannot sign message in read-only mode");
      },
      balanceOf: async (address: string): Promise<Balance> => {
        try {
          // Use viem to get the balance
          const balance = await publicClient.getBalance({
            address: address as `0x${string}`,
          });
          return {
            decimals: 18,
            symbol: networkConfig.nativeCurrency?.symbol || "ETH",
            name: networkConfig.nativeCurrency?.name || "Ethereum",
            value: formatUnits(balance.toString(), 18),
            inBaseUnits: balance.toString(),
          };
        } catch (error) {
          console.error("Error getting balance:", error);
          return {
            decimals: 18,
            symbol: networkConfig.nativeCurrency?.symbol || "ETH",
            name: networkConfig.nativeCurrency?.name || "Ethereum",
            value: "0",
            inBaseUnits: "0",
          };
        }
      },
      getCoreTools: () => {
        return [];
      },
    };

    return readOnlyAdapter;
  }

  // For connected wallets, we'll use the injected provider
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer = provider.getSigner();

  // Need to wrap async getAddress in a sync function for the GOAT SDK
  let cachedAddress = "0x0000000000000000000000000000000000000000";

  // Immediately fetch the address in the background
  signer
    .getAddress()
    .then((address: string) => {
      cachedAddress = address;
    })
    .catch((error: Error) => {
      console.error("Error getting address:", error);
    });

  const walletAdapter: WalletClientBase = {
    getAddress: () => {
      return cachedAddress;
    },
    getChain: () => {
      return {
        id: networkConfig.chainId,
        name: networkConfig.name.toLowerCase(),
        type: "evm",
      } as CoreChain;
    },
    signMessage: async (message: string) => {
      const signature = await signer.signMessage(message);
      return { signature };
    },
    balanceOf: async (address: string): Promise<Balance> => {
      try {
        const balance = await provider.getBalance(address);
        return {
          decimals: 18,
          symbol: networkConfig.nativeCurrency?.symbol || "ETH",
          name: networkConfig.nativeCurrency?.name || "Ethereum",
          value: ethers.utils.formatEther(balance),
          inBaseUnits: balance.toString(),
        };
      } catch (error) {
        console.error("Error getting balance:", error);
        return {
          decimals: 18,
          symbol: networkConfig.nativeCurrency?.symbol || "ETH",
          name: networkConfig.nativeCurrency?.name || "Ethereum",
          value: "0",
          inBaseUnits: "0",
        };
      }
    },
    getCoreTools: () => {
      return [];
    },
  };

  return walletAdapter;
};

// ERC20 token definitions for Celo
export const USDC: TokenDefinition = {
  decimals: 6,
  symbol: "USDC",
  name: "USD Coin",
  chains: {
    44787: {
      // Celo Alfajores testnet
      contractAddress:
        "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B" as `0x${string}`,
    },
    31: {
      // Rootstock testnet
      contractAddress:
        "0xa683146bb93544068737dfca59f098e7844cdfa8" as `0x${string}`,
    },
  },
};

// Initialize GOAT SDK tools
let toolsCache: Map<string, OnChainTool> | null = null;

export const getGOATTools = async () => {
  if (toolsCache) return toolsCache;

  // Create the wallet adapter
  const walletAdapter = await createWalletAdapter();
  console.log("Created wallet adapter");

  // Get the tools from GOAT SDK
  const tools = await getOnChainTools({
    wallet: walletAdapter,
    plugins: [
      erc20({
        tokens: [USDC],
      }),
    ],
  });

  // Store tools by name for easier lookup using Map for iteration support
  const toolsMap = new Map<string, OnChainTool>();

  // Handle tools properly based on its actual structure
  if (Array.isArray(tools)) {
    for (const tool of tools) {
      toolsMap.set(tool.name, tool);
    }
  } else {
    // If tools is an object with string keys
    for (const key in tools) {
      if (Object.prototype.hasOwnProperty.call(tools, key)) {
        const tool = tools[key as keyof typeof tools] as unknown as OnChainTool;
        toolsMap.set(tool.name, tool);
      }
    }
  }

  toolsCache = toolsMap;
  return toolsMap;
};

//  send token
//  approve token
//  get balance
//  get allowance
//  get total supply
//  convert to base unit
//  convert from base unit

/**
 * Get token balance for a specific address
 * @param {string} address Wallet address to check
 * @param {string} symbol Token symbol (e.g., "USDC")
 * @returns {Promise<string>} Token balance in human-readable format
 */
export const getTokenBalance = async (
  address: string,
  symbol: string
): Promise<string> => {
  try {
    const tools = await getGOATTools();
    const networkConfig = await getNetworkConfig();

    if (!tools.get("getBalance")) {
      console.warn("getBalance tool not found, using direct viem access");

      // Create a public client for the network
      const publicClient = createPublicClient({
        chain: networkConfig.chain,
        transport: http(networkConfig.rpcUrl),
      });

      // If it's the native token, we can get the balance directly
      if (symbol.toUpperCase() === networkConfig.nativeCurrency?.symbol) {
        console.log("Checking native token balance using viem");

        try {
          const balance = await publicClient.getBalance({
            address: address as `0x${string}`,
          });
          return formatUnits(balance.toString(), 18);
        } catch (error) {
          console.error("Error getting native balance with viem:", error);
        }
      }
      // For USDC and other tokens, use the contract
      else if (symbol.toUpperCase() === "USDC") {
        console.log("Checking USDC balance using viem direct contract access");

        try {
          // Get the appropriate contract address for the current network
          const chainId = networkConfig.chainId;
          const tokenData = USDC.chains[chainId];

          if (!tokenData) {
            console.error(
              `No contract address for ${symbol} on chainId ${chainId}`
            );
            return `No ${symbol} contract found on this network`;
          }

          console.log(`Using ${symbol} contract: ${tokenData.contractAddress}`);

          // ERC20 balanceOf ABI fragment
          const erc20Abi = [
            {
              constant: true,
              inputs: [
                {
                  name: "_owner",
                  type: "address",
                },
              ],
              name: "balanceOf",
              outputs: [
                {
                  name: "balance",
                  type: "uint256",
                },
              ],
              payable: false,
              stateMutability: "view",
              type: "function",
            },
            {
              constant: true,
              inputs: [],
              name: "decimals",
              outputs: [
                {
                  name: "",
                  type: "uint8",
                },
              ],
              payable: false,
              stateMutability: "view",
              type: "function",
            },
          ];

          // Read balance from contract
          const balance: bigint = (await publicClient.readContract({
            address: tokenData.contractAddress,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
          })) as bigint;

          // Read decimals from contract
          let decimals = USDC.decimals; // Default value
          try {
            const contractDecimals = (await publicClient.readContract({
              address: tokenData.contractAddress,
              abi: erc20Abi,
              functionName: "decimals",
            })) as number;
            decimals = contractDecimals;
          } catch {
            console.warn(
              `Could not read decimals from contract, using default: ${decimals}`
            );
          }

          return formatUnits(balance.toString(), decimals);
        } catch (error) {
          console.error(`Error getting ${symbol} balance with viem:`, error);
        }
      }

      return `Balance not available for ${symbol}`;
    }

    console.log(`Using GOAT SDK tool to get ${symbol} balance for ${address}`);
    // Call the tool with the required parameters
    const result = await tools.get("getBalance")!.execute({
      address,
      symbol,
    });

    return result as string;
  } catch (error) {
    console.error("Error in getTokenBalance:", error);
    return "Error checking balance";
  }
};

/**
 * Transfer tokens to another address
 * @param {string} to Recipient address
 * @param {string} amount Amount to transfer
 * @param {string} symbol Token symbol
 * @returns {Promise<ethers.providers.TransactionReceipt | {
 *   requiresWallet: boolean,
 *   action: string,
 *   params: {
 *     to: string;
 *     amount: string;
 *     symbol: string;
 *     chainId: number;
 *   }
 * }>} Transaction receipt or wallet request object
 */
export const transferTokens = async (
  to: string,
  amount: string,
  symbol: string
): Promise<
  | ethers.providers.TransactionReceipt
  | {
      requiresWallet: boolean;
      action: string;
      params: {
        to: string;
        amount: string;
        symbol: string;
        chainId: number;
      };
    }
> => {
  try {
    const tools = await getGOATTools();
    const networkConfig = await getNetworkConfig();

    if (!tools.get("transfer")) {
      console.warn("transfer tool not found, using fallback mechanism");

      // Check if wallet is connected first
      if (!ethereum) {
        console.log("No wallet detected, returning wallet request object");
        // Instead of throwing an error, return an object that indicates wallet is required
        // This will allow the frontend to handle this properly
        return {
          requiresWallet: true,
          action: "transfer",
          params: {
            to,
            amount,
            symbol,
            chainId: networkConfig.chainId,
          },
        };
      }

      // Create a provider and signer
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();

      // For native token transfers
      if (symbol.toUpperCase() === networkConfig.nativeCurrency?.symbol) {
        console.log(`Transferring native ${symbol} using direct ethers method`);

        // Convert amount to wei
        const amountInWei = ethers.utils.parseEther(amount);

        // Send transaction
        const tx = await signer.sendTransaction({
          to: to as string,
          value: amountInWei,
        });

        // Wait for transaction to be mined
        return await tx.wait();
      }
      // For ERC20 tokens like USDC
      else if (symbol.toUpperCase() === "USDC") {
        // Get token contract address for current network
        const chainId = networkConfig.chainId;
        const tokenData = USDC.chains[chainId];

        if (!tokenData) {
          throw new Error(
            `No contract address for ${symbol} on chainId ${chainId}`
          );
        }

        // ERC20 transfer ABI fragment
        const erc20Abi = [
          {
            constant: false,
            inputs: [
              { name: "_to", type: "address" },
              { name: "_value", type: "uint256" },
            ],
            name: "transfer",
            outputs: [{ name: "", type: "bool" }],
            payable: false,
            stateMutability: "nonpayable",
            type: "function",
          },
          {
            constant: true,
            inputs: [],
            name: "decimals",
            outputs: [{ name: "", type: "uint8" }],
            payable: false,
            stateMutability: "view",
            type: "function",
          },
        ];

        // Create contract instance
        const tokenContract = new ethers.Contract(
          tokenData.contractAddress,
          erc20Abi,
          signer
        );

        // Get token decimals
        let decimals = USDC.decimals; // Default
        try {
          decimals = await tokenContract.decimals();
        } catch {
          console.warn(
            `Could not read decimals from contract, using default: ${decimals}`
          );
        }

        // Parse amount with correct decimals
        const parsedAmount = ethers.utils.parseUnits(amount, decimals);

        // Execute transfer
        const tx = await tokenContract.transfer(to, parsedAmount);

        // Wait for transaction to be mined
        return await tx.wait();
      }

      throw new Error(
        `Token ${symbol} transfer not supported in fallback mode`
      );
    }

    // Call the tool with the required parameters
    const result = await tools.get("transfer")!.execute({
      to,
      amount,
      symbol,
    });

    // Wait for the transaction to be processed
    const provider = new ethers.providers.JsonRpcProvider(
      networkConfig.rpcUrl,
      {
        name: networkConfig.name,
        chainId: networkConfig.chainId,
      }
    );

    return provider.waitForTransaction(result as string);
  } catch (error) {
    console.error("Error in transferTokens:", error);
    throw error;
  }
};

/**
 * Approve tokens for a spender
 * @param {string} spender Spender address
 * @param {string} amount Amount to approve
 * @param {string} symbol Token symbol
 * @returns {Promise<ethers.providers.TransactionReceipt>} Transaction receipt
 */
export const approveTokens = async (
  spender: string,
  amount: string,
  symbol: string
): Promise<ethers.providers.TransactionReceipt> => {
  try {
    const tools = await getGOATTools();

    if (!tools.get("approve")) {
      throw new Error("approve tool not found");
    }

    // Call the tool with the required parameters
    const result = await tools.get("approve")!.execute({
      spender,
      amount,
      symbol,
    });

    // Wait for the transaction to be processed
    const networkConfig = await getNetworkConfig();
    const provider = new ethers.providers.JsonRpcProvider(
      networkConfig.rpcUrl,
      {
        name: networkConfig.name,
        chainId: networkConfig.chainId,
      }
    );

    return provider.waitForTransaction(result as string);
  } catch (error) {
    console.error("Error in approveTokens:", error);
    throw error;
  }
};

/**
 * Get allowance for a spender
 * @param {string} owner Owner address
 * @param {string} spender Spender address
 * @param {string} symbol Token symbol
 * @returns {Promise<string>} Allowance amount
 */
export const getAllowance = async (
  owner: string,
  spender: string,
  symbol: string
): Promise<string> => {
  try {
    const tools = await getGOATTools();

    if (!tools.get("getAllowance")) {
      console.warn("getAllowance tool not found, using fallback");
      return `Allowance not available for ${symbol}`;
    }

    // Call the tool with the required parameters
    const result = await tools.get("getAllowance")!.execute({
      owner,
      spender,
      symbol,
    });

    return result as string;
  } catch (error) {
    console.error("Error in getAllowance:", error);
    return "Error checking allowance";
  }
};

/**
 * Get total supply of a token
 * @param {string} symbol Token symbol
 * @returns {Promise<string>} Total supply
 */
export const getTotalSupply = async (symbol: string): Promise<string> => {
  try {
    const tools = await getGOATTools();

    if (!tools.get("getTotalSupply")) {
      console.warn("getTotalSupply tool not found, using fallback");
      return `Total supply not available for ${symbol}`;
    }

    // Call the tool with the required parameters
    const result = await tools.get("getTotalSupply")!.execute({
      symbol,
    });

    return result as string;
  } catch (error) {
    console.error("Error in getTotalSupply:", error);
    return "Error checking total supply";
  }
};

/**
 * Revoke approval for a spender
 * @param {string} spender Spender address
 * @param {string} symbol Token symbol
 * @returns {Promise<ethers.providers.TransactionReceipt>} Transaction receipt
 */
export const revokeApproval = async (
  spender: string,
  symbol: string
): Promise<ethers.providers.TransactionReceipt> => {
  try {
    const tools = await getGOATTools();

    if (!tools.get("revokeApproval")) {
      throw new Error("revokeApproval tool not found");
    }

    // Call the tool with the required parameters
    const result = await tools.get("revokeApproval")!.execute({
      spender,
      symbol,
    });

    // Wait for the transaction to be processed
    const networkConfig = await getNetworkConfig();
    const provider = new ethers.providers.JsonRpcProvider(
      networkConfig.rpcUrl,
      {
        name: networkConfig.name,
        chainId: networkConfig.chainId,
      }
    );

    return provider.waitForTransaction(result as string);
  } catch (error) {
    console.error("Error in revokeApproval:", error);
    throw error;
  }
};

/**
 * Convert token amount to base units (e.g., wei)
 * @param {string} amount Amount in human-readable format
 * @param {string} symbol Token symbol
 * @returns {Promise<string>} Amount in base units
 */
export const convertToBaseUnit = async (
  amount: string,
  symbol: string
): Promise<string> => {
  try {
    const tools = await getGOATTools();

    if (!tools.get("convertToBaseUnit")) {
      console.warn("convertToBaseUnit tool not found, using fallback");
      // Use ethers utils as fallback
      return ethers.utils.parseEther(amount).toString();
    }

    // Call the tool with the required parameters
    const result = await tools.get("convertToBaseUnit")!.execute({
      amount,
      symbol,
    });

    return result as string;
  } catch (error) {
    console.error("Error in convertToBaseUnit:", error);
    // Try to use ethers.js as a fallback
    try {
      return ethers.utils.parseEther(amount).toString();
    } catch {
      return "Error converting to base units";
    }
  }
};

/**
 * Convert token amount from base units to human-readable format
 * @param {string} amount Amount in base units
 * @param {string} symbol Token symbol
 * @returns {Promise<string>} Amount in human-readable format
 */
export const convertFromBaseUnit = async (
  amount: string,
  symbol: string
): Promise<string> => {
  try {
    const tools = await getGOATTools();

    if (!tools.get("convertFromBaseUnit")) {
      console.warn("convertFromBaseUnit tool not found, using fallback");
      // Use ethers utils as fallback
      return ethers.utils.formatEther(amount);
    }

    // Call the tool with the required parameters
    const result = await tools.get("convertFromBaseUnit")!.execute({
      amount,
      symbol,
    });

    return result as string;
  } catch (error) {
    console.error("Error in convertFromBaseUnit:", error);
    // Try to use ethers.js as a fallback
    try {
      return ethers.utils.formatEther(amount);
    } catch {
      return "Error converting from base units";
    }
  }
};

/**
 * Add a custom token to the ERC20 plugin
 * @param {TokenDefinition} newToken Token configuration
 */
export const addCustomToken = async (
  newToken: TokenDefinition
): Promise<void> => {
  // Reset tools cache to force recreation with the new token
  toolsCache = null;

  // Log that the token was added to help debugging
  console.log(`Added custom token: ${newToken.symbol} (${newToken.name})`);

  // The custom token will be used when GOAT SDK tools are initialized again
  const walletAdapter = await createWalletAdapter();

  // Initialize with the new token
  await getOnChainTools({
    wallet: walletAdapter,
    plugins: [
      erc20({
        tokens: [USDC, newToken],
      }),
    ],
  });
};

// Export utility functions
export { isBrowser };
