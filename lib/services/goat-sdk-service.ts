import { ethers } from "ethers";

import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { ERC20Plugin, PEPE, USDC, erc20 } from "@goat-sdk/plugin-erc20";
import { uniswap } from "@goat-sdk/plugin-uniswap";

import { sendETH, SendETHPlugin } from "@goat-sdk/wallet-evm";

// JSON-RPC request/response types
type JsonRpcMethod = string;
type JsonRpcParams = unknown[];
type JsonRpcResult = unknown;

// Provider type definition with more specific types
export interface Provider extends ethers.providers.ExternalProvider {
  request: (args: {
    method: JsonRpcMethod;
    params?: JsonRpcParams;
  }) => Promise<JsonRpcResult>;
}

// EVM read result type
interface EVMReadResult {
  data: string;
}

// EIP-712 typed data interfaces
interface TypedDataDomain {
  name?: string;
  version?: string;
  chainId?: number;
  verifyingContract?: string;
  salt?: string;
}

interface TypedDataTypes {
  [typeName: string]: Array<{ name: string; type: string }>;
}

/**
 * Adapter function to convert Web3Provider to Provider compatible with GOAT SDK
 */
export const adaptProvider = (
  web3Provider: ethers.providers.Web3Provider
): Provider => {
  const externalProvider =
    web3Provider.provider as ethers.providers.ExternalProvider;

  if (!externalProvider || typeof externalProvider.request !== "function") {
    return {
      request: () => {
        console.error("Provider not properly initialized");
        return Promise.reject(new Error("Provider not properly initialized"));
      },
      ...externalProvider,
    };
  }

  return {
    request: (args: { method: JsonRpcMethod; params?: JsonRpcParams }) => {
      const requestMethod = externalProvider.request;
      if (!requestMethod) {
        return Promise.reject(
          new Error("Provider request method is undefined")
        );
      }
      return requestMethod(args);
    },
    ...externalProvider,
  };
};

/**
 * Get browser connected wallet
 * @returns Web3Provider from the browser
 */
export const getBrowserWallet =
  async (): Promise<ethers.providers.Web3Provider> => {
    // Check if window is defined (browser environment)
    if (typeof window !== "undefined" && window.ethereum) {
      // Create a Web3Provider using the browser's ethereum object
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      // Request access to the user's accounts
      await provider.send("eth_requestAccounts", []);

      return provider;
    }

    throw new Error("No browser ethereum provider found");
  };

// Define the transaction interface with specific types
interface TransactionRequest {
  to?: string;
  from?: string;
  nonce?: ethers.BigNumberish;
  gasLimit?: ethers.BigNumberish;
  gasPrice?: ethers.BigNumberish;
  data?: ethers.BytesLike;
  value?: ethers.BigNumberish;
  chainId?: number;
}

/**
 * Create a wallet adapter for GOAT SDK that works with browser wallets
 */
export const createWalletAdapter = async (
  provider: ethers.providers.Web3Provider
) => {
  const signer = provider.getSigner();
  const address = await signer.getAddress();
  const adaptedProvider = adaptProvider(provider);
  const { chainId } = await provider.getNetwork();

  // Create the adapter object with the required methods
  return {
    address,
    provider: adaptedProvider,

    // Return signature object to match the expected structure
    async signMessage(message: string) {
      const signature = await signer.signMessage(message);
      return { signature };
    },

    async sendTransaction(tx: TransactionRequest) {
      return await signer.sendTransaction(tx);
    },

    // Add the missing methods required by EVMWalletClient
    async read(args: {
      contractAddress: string;
      data: string;
    }): Promise<EVMReadResult> {
      const result = await provider.call({
        to: args.contractAddress,
        data: args.data,
      });
      return { data: result };
    },

    async signTypedData(args: {
      domain: TypedDataDomain;
      types: TypedDataTypes;
      message: Record<string, unknown>;
    }) {
      // Implementation for EIP-712 typed data signing
      const signature = await signer._signTypedData(
        args.domain,
        args.types,
        args.message
      );
      return { signature };
    },

    // Sync method to match WalletClientBase
    getAddress() {
      return address;
    },

    // Sync method to match WalletClientBase with correct chain type
    getChain() {
      return { id: chainId, type: "evm" } as const;
    },

    async balanceOf(targetAddress: string) {
      const balance = await provider.getBalance(targetAddress);
      return {
        decimals: 18,
        symbol: "ETH",
        name: "Ethereum",
        value: ethers.utils.formatEther(balance),
        inBaseUnits: balance.toString(),
      };
    },

    getCoreTools() {
      return [];
    },
  };
};

/**
 * Get on-chain tools configured with the provided wallet
 * @param provider Web3Provider from browser wallet
 * @param includeUniswap Whether to include Uniswap plugin
 * @returns On-chain tools object
 */
export const getTools = async (
  provider: ethers.providers.Web3Provider,
  includeUniswap: boolean = false
) => {
  // Create wallet adapter for browser wallet
  const walletAdapter = await createWalletAdapter(provider);

  // Define base plugins
  const plugins = [sendETH(), erc20({ tokens: [USDC, PEPE] })];

  if (includeUniswap) {
    // Add Uniswap plugin with type assertion
    plugins.push(
      uniswap({
        baseUrl: process.env.NEXT_PUBLIC_UNISWAP_BASE_URL as string,
        apiKey: process.env.NEXT_PUBLIC_UNISWAP_API_KEY as string,
      }) as SendETHPlugin | ERC20Plugin
    );
  }

  // Use type assertion to bypass TypeScript compatibility checks
  return await getOnChainTools({
    wallet: walletAdapter,
    plugins: plugins as unknown as Parameters<
      typeof getOnChainTools
    >[0]["plugins"],
  });
};

/**
 * Main entry point to start the service with browser wallet
 * @param includeUniswap Whether to include Uniswap plugin
 */
export const startGoatService = async (includeUniswap: boolean = false) => {
  const provider = await getBrowserWallet();
  const tools = await getTools(provider, includeUniswap);
  return tools;
};
