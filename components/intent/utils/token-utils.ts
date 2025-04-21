import { ethers } from "ethers";
import axios from "axios";
import { Provider as GoatProvider } from "@/lib/services/integration.d";

// Types
export interface Token {
  symbol: string;
  name: string;
  balance: string;
  icon: string;
  chain: string;
  price: number;
  change24h: number;
}

export interface TokenBalance {
  token: string;
  symbol: string;
  amount: string;
  decimals: number;
  usdValue?: number;
}

// Provider type for web3 providers
export type Web3Provider = ethers.providers.ExternalProvider;

// Minimal ERC20 ABI for fetching token information and balances
export const ERC20_ABI = [
  // Read-only functions
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

// Common token address mapping by chain ID
export const CHAIN_TOKEN_ADDRESSES: Record<number, Record<string, string>> = {
  // Ethereum Mainnet
  1: {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
  },
  // Polygon
  137: {
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
  },
  // Celo
  42220: {
    CELO: "0x471EcE3750Da237f93B8E339c536989b8978a438",
    cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    cEUR: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
  },
  // Arbitrum
  42161: {
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548",
    USDC: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  },
  // Testnet fallbacks - using placeholders
  44787: {
    // Celo Alfajores
    CELO: "0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9",
    cUSD: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
    cEUR: "0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F",
  },
  31: {
    // Rootstock testnet
    RBTC: "0x0000000000000000000000000000000000000000", // Native token
    DOC: "0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0", // Example address
  },
};

// Helper function to get native token symbol by chain ID
export const getNativeTokenSymbol = (chainId: number): string => {
  switch (chainId) {
    case 1:
      return "ETH";
    case 137:
      return "MATIC";
    case 56:
      return "BNB";
    case 42220:
    case 44787:
      return "CELO";
    case 42161:
      return "ETH"; // Arbitrum uses ETH
    case 31:
      return "RBTC"; // Rootstock
    case 2743859179913000:
      return "IFI"; // Saga IFI
    default:
      return "ETH";
  }
};

// Helper function to get native token name by chain ID
export const getNativeTokenName = (chainId: number): string => {
  switch (chainId) {
    case 1:
      return "Ethereum";
    case 137:
      return "Polygon";
    case 56:
      return "Binance Coin";
    case 42220:
    case 44787:
      return "Celo";
    case 42161:
      return "Ethereum"; // Arbitrum uses ETH
    case 31:
      return "Rootstock BTC";
    case 2743859179913000:
      return "IntentFi";
    default:
      return "Ethereum";
  }
};

// Helper function to get icon URL for native token
export const getNativeTokenIcon = (symbol: string): string => {
  switch (symbol) {
    case "ETH":
      return "https://cryptologos.cc/logos/ethereum-eth-logo.png";
    case "MATIC":
      return "https://cryptologos.cc/logos/polygon-matic-logo.png";
    case "BNB":
      return "https://cryptologos.cc/logos/bnb-bnb-logo.png";
    case "CELO":
      return "https://cryptologos.cc/logos/celo-celo-logo.png";
    case "RBTC":
      return "https://cryptologos.cc/logos/rootstock-rbtc-logo.png";
    case "IFI":
      return "https://cryptologos.cc/logos/crypto-com-chain-cro-logo.png"; // Placeholder
    default:
      return "https://cryptologos.cc/logos/ethereum-eth-logo.png";
  }
};

// Helper function to get chain name by chain ID
export const getChainName = (chainId: number): string => {
  switch (chainId) {
    case 1:
      return "Ethereum";
    case 137:
      return "Polygon";
    case 56:
      return "Binance Smart Chain";
    case 42220:
      return "Celo";
    case 44787:
      return "Celo Alfajores";
    case 42161:
      return "Arbitrum";
    case 31:
      return "Rootstock";
    case 2743859179913000:
      return "Saga IFI";
    default:
      return `Chain ${chainId}`;
  }
};

// Helper function to get CoinGecko token ID from symbol
export const getCoingeckoId = (symbol: string): string | null => {
  const normalizedSymbol = symbol.toUpperCase();
  const idMapping: Record<string, string> = {
    ETH: "ethereum",
    WETH: "weth",
    BTC: "bitcoin",
    WBTC: "wrapped-bitcoin",
    USDC: "usd-coin",
    USDT: "tether",
    DAI: "dai",
    MATIC: "matic-network",
    CELO: "celo",
    CUSD: "celo-dollar",
    CEUR: "celo-euro",
    ARB: "arbitrum",
    LINK: "chainlink",
    // Add more mappings as needed
  };

  return idMapping[normalizedSymbol] || null;
};

// Format token icon URL for different tokens
export const getTokenIconUrl = (symbol: string): string => {
  const symbolLower = symbol.toLowerCase();

  if (symbolLower === "celo") {
    return "https://cryptologos.cc/logos/celo-celo-logo.png";
  } else if (symbolLower === "cusd") {
    return "https://cryptologos.cc/logos/celo-dollar-cusd-logo.png";
  } else if (symbolLower === "ceur") {
    return "https://cryptologos.cc/logos/celo-euro-ceur-logo.png";
  } else {
    return `https://cryptologos.cc/logos/${symbolLower}-${symbolLower}-logo.png`;
  }
};

// Function to fetch token prices from CoinGecko
export const fetchTokenPrices = async (tokens: Token[]): Promise<Token[]> => {
  if (tokens.length === 0) return tokens;

  try {
    // Create a list of token IDs to query
    const tokenIds = tokens
      .map((token) => getCoingeckoId(token.symbol))
      .filter((id) => id);

    if (tokenIds.length === 0) return tokens;

    // Fetch price data from CoinGecko API
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${tokenIds.join(
        ","
      )}&vs_currencies=usd&include_24hr_change=true`
    );

    if (response.data) {
      // Update tokens with price data
      return tokens.map((token) => {
        const coingeckoId = getCoingeckoId(token.symbol);
        const priceData = coingeckoId ? response.data[coingeckoId] : null;

        if (priceData) {
          return {
            ...token,
            price: priceData.usd || 0,
            change24h: priceData.usd_24h_change || 0,
          };
        }
        return token;
      });
    }

    return tokens;
  } catch (error) {
    console.error("Error fetching token prices:", error);
    return tokens;
  }
};

// Add Provider adapter similar to the one in swap-utils
/**
 * Adapter function to convert Web3Provider to GoatProvider
 */
const adaptToGoatProvider = (web3Provider: Web3Provider): GoatProvider => {
  // Create an ethers Web3Provider from the ExternalProvider
  const ethersProvider = new ethers.providers.Web3Provider(web3Provider);
  return ethersProvider;
};

// Update the fetchUserTokenBalances function
export const fetchUserTokenBalances = async (
  account: string,
  chainId: number,
  provider: Web3Provider,
  getTokenBalancesWithGoat: (
    chainId: number,
    account: string,
    provider: GoatProvider
  ) => Promise<TokenBalance[]>
): Promise<Token[]> => {
  if (!account || !chainId) {
    return [];
  }

  try {
    // Adapt the provider for GOAT SDK
    const adaptedProvider = adaptToGoatProvider(provider);

    // Use our modified implementation for token balances
    const goatBalances = await getTokenBalancesWithGoat(
      chainId,
      account,
      adaptedProvider
    );

    // Convert our format to the Token format
    const tokens: Token[] = [];

    // Get chain name for the display
    const chainName = getChainName(chainId);

    // Add native token first - we still need to handle this specially
    const nativeBalance = await new ethers.providers.Web3Provider(
      provider
    ).getBalance(account);
    const nativeTokenSymbol = getNativeTokenSymbol(chainId);
    const nativeTokenDecimals = 18; // Most native tokens have 18 decimals
    const formattedNativeBalance = ethers.utils.formatUnits(
      nativeBalance,
      nativeTokenDecimals
    );

    // Add native token to token list
    tokens.push({
      symbol: nativeTokenSymbol,
      name: getNativeTokenName(chainId),
      balance: formattedNativeBalance,
      icon: getNativeTokenIcon(nativeTokenSymbol),
      chain: chainName,
      price: 0, // Will be updated with price data
      change24h: 0, // Will be updated with price data
    });

    // Process tokens from our implementation
    for (const balance of goatBalances) {
      // Format token icon URL
      const iconUrl = getTokenIconUrl(balance.symbol);

      // Add token to our list
      tokens.push({
        symbol: balance.symbol,
        name: balance.symbol, // Using symbol as name for simplicity
        balance: balance.amount,
        icon: iconUrl,
        chain: chainName,
        price: balance.usdValue || 0,
        change24h: 0, // Not provided by our implementation
      });
    }

    return tokens;
  } catch (error) {
    console.error("Error fetching token balances:", error);
    // Fallback to original implementation for reliability
    return fallbackFetchUserTokenBalances(account, chainId, provider);
  }
};

// Fallback implementation for token balances
export const fallbackFetchUserTokenBalances = async (
  account: string,
  chainId: number,
  provider: Web3Provider
): Promise<Token[]> => {
  if (!account || !chainId) {
    return [];
  }

  try {
    // Get provider based on current chain
    const ethersProvider = new ethers.providers.Web3Provider(provider);

    // Get native token balance (ETH, MATIC, BNB, etc.)
    const nativeBalance = await ethersProvider.getBalance(account);
    const nativeTokenSymbol = getNativeTokenSymbol(chainId);
    const nativeTokenDecimals = 18; // Most native tokens have 18 decimals

    // Format native token balance
    const formattedNativeBalance = ethers.utils.formatUnits(
      nativeBalance,
      nativeTokenDecimals
    );

    // Start with native token
    const tokens: Token[] = [];

    // Get current chain name
    const chainName = getChainName(chainId);

    // Add native token to token list
    tokens.push({
      symbol: nativeTokenSymbol,
      name: getNativeTokenName(chainId),
      balance: formattedNativeBalance,
      icon: getNativeTokenIcon(nativeTokenSymbol),
      chain: chainName,
      price: 0, // Will be updated with price data
      change24h: 0, // Will be updated with price data
    });

    // Get token addresses for current chain
    const tokenAddresses = CHAIN_TOKEN_ADDRESSES[chainId] || {};

    // Fetch ERC20 token balances
    const tokenPromises = Object.entries(tokenAddresses).map(
      async ([symbol, address]) => {
        try {
          const tokenContract = new ethers.Contract(
            address,
            ERC20_ABI,
            ethersProvider
          );

          // Fetch token details
          const balance = await tokenContract.balanceOf(account);
          const decimals = await tokenContract.decimals();
          const name = await tokenContract.name();

          // Format balance based on token decimals
          const formattedBalance = ethers.utils.formatUnits(balance, decimals);

          // Only return tokens with non-zero balance
          if (parseFloat(formattedBalance) > 0) {
            // Format token icon URL - special case for some tokens
            const iconUrl = getTokenIconUrl(symbol);

            return {
              symbol: symbol,
              name: name,
              balance: formattedBalance,
              icon: iconUrl,
              chain: chainName,
              price: 0, // Will be updated with price data
              change24h: 0, // Will be updated with price data
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching token ${symbol}:`, error);
          return null;
        }
      }
    );

    // Wait for all token promises to resolve
    const tokenResults = await Promise.all(tokenPromises);

    // Filter out null results and add valid tokens to our list
    tokenResults
      .filter((token) => token !== null)
      .forEach((token) => {
        if (token) tokens.push(token);
      });

    return tokens;
  } catch (error) {
    console.error("Error fetching token balances:", error);
    return [];
  }
};
