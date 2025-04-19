"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAccount, useChainId } from "wagmi";
import {
  Loader2,
  Send,
  ArrowRight,
  X,
  Coins,
  PlusCircle,
  ZapIcon,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { INTENT_PATTERNS } from "@/lib/services/intent_patterns";
import { financialKeywords } from "@/lib/services/financialKeywords";
import { ethers } from "ethers";
import axios from "axios";
import { integration } from "@/lib/services/integration";

// Minimal ERC20 ABI for fetching token information and balances
const ERC20_ABI = [
  // Read-only functions
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

// Common token address mapping by chain ID
const CHAIN_TOKEN_ADDRESSES: Record<number, Record<string, string>> = {
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
const getNativeTokenSymbol = (chainId: number): string => {
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
const getNativeTokenName = (chainId: number): string => {
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
const getNativeTokenIcon = (symbol: string): string => {
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
const getChainName = (chainId: number): string => {
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
const getCoingeckoId = (symbol: string): string | null => {
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

// Function to fetch token balances from blockchain
const fetchUserTokenBalances = async (
  account: string,
  chainId: number
): Promise<Token[]> => {
  if (!account || !chainId) {
    return [];
  }

  try {
    // Use our modified implementation for token balances
    const goatBalances = await integration.getTokenBalancesWithGoat(
      chainId,
      account,
      window.ethereum
    );

    // Convert our format to the Token format
    const tokens: Token[] = [];

    // Get chain name for the display
    const chainName = getChainName(chainId);

    // Add native token first - we still need to handle this specially
    const nativeBalance = await new ethers.providers.Web3Provider(
      window.ethereum
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
      // Format token icon URL - special case for some tokens
      let iconUrl;
      const symbolLower = balance.symbol.toLowerCase();

      if (symbolLower === "celo") {
        iconUrl = "https://cryptologos.cc/logos/celo-celo-logo.png";
      } else if (symbolLower === "cusd") {
        iconUrl = "https://cryptologos.cc/logos/celo-dollar-cusd-logo.png";
      } else if (symbolLower === "ceur") {
        iconUrl = "https://cryptologos.cc/logos/celo-euro-ceur-logo.png";
      } else {
        iconUrl = `https://cryptologos.cc/logos/${symbolLower}-${symbolLower}-logo.png`;
      }

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
    return fallbackFetchUserTokenBalances(account, chainId);
  }
};

// Original implementation kept as fallback
const fallbackFetchUserTokenBalances = async (
  account: string,
  chainId: number
): Promise<Token[]> => {
  if (!account || !chainId) {
    return [];
  }

  try {
    // Get provider based on current chain
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    // Get native token balance (ETH, MATIC, BNB, etc.)
    const nativeBalance = await provider.getBalance(account);
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
            provider
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
            let iconUrl;
            const symbolLower = symbol.toLowerCase();

            if (symbolLower === "celo") {
              iconUrl = "https://cryptologos.cc/logos/celo-celo-logo.png";
            } else if (symbolLower === "cusd") {
              iconUrl =
                "https://cryptologos.cc/logos/celo-dollar-cusd-logo.png";
            } else if (symbolLower === "ceur") {
              iconUrl = "https://cryptologos.cc/logos/celo-euro-ceur-logo.png";
            } else {
              iconUrl = `https://cryptologos.cc/logos/${symbolLower}-${symbolLower}-logo.png`;
            }

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

// Function to fetch token prices from CoinGecko
const fetchTokenPrices = async (tokens: Token[]): Promise<Token[]> => {
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

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  tokens?: {
    symbol: string;
    balance: string;
    icon?: string;
    price?: number;
  }[];
  actions?: {
    label: string;
    action: string;
    intent?: string;
  }[];
}

interface Token {
  symbol: string;
  name: string;
  balance: string;
  icon: string;
  chain: string;
  price: number;
  change24h: number;
}

// Update the example intents with chain-specific versions that match our functions
const CHAIN_SPECIFIC_INTENTS: Record<string, string[]> = {
  // Celo Alfajores examples
  "44787": [
    "Deposit 10 USDC on Celo",
    "Withdraw 5 CELO from lending pool",
    "Borrow 100 USDT on Celo",
    "Repay 50 USDC loan on Celo",
    "Check my CELO balance",
    "Stake 10 CELO in pool 4",
    "Unstake 5 CELO from pool 4",
    "Get pool information on Celo",
  ],
  // Rootstock examples
  "31": [
    "Deposit 0.1 RBTC on Rootstock",
    "Withdraw 5 USDT from Rootstock",
    "Borrow 10 USDT on Rootstock",
    "Repay 5 RBTC loan on Rootstock",
    "Check my RBTC balance",
    "Stake 1 RBTC in pool 4",
    "Unstake 0.5 RBTC from pool 4",
    "Get pool information on Rootstock",
  ],
  // Saga IFI examples
  "2743859179913000": [
    "Deposit 10 USDC on Saga",
    "Withdraw 5 IFI from lending pool",
    "Borrow 20 USDT on Saga",
    "Repay 10 IFI loan",
    "Check my IFI balance",
    "Stake 5 IFI in pool 4",
    "Unstake 2 IFI from pool 4",
    "Get pool information on Saga",
  ],
  // Default examples for any other chain
  default: [
    "Deposit 10 USDC",
    "Withdraw 5 ETH from lending pool",
    "Borrow 100 USDT",
    "Repay 50 USDC loan",
    "Check my token balance",
    "Stake 10 tokens in pool 4",
    "Unstake 5 tokens from pool 4",
    "Get pool information",
  ],
};

export default function IntentAgent({
  onCreateIntent,
}: {
  onCreateIntent: (intent: string) => void;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your IntentFi Agent powered by GOAT SDK. I can help you execute DeFi strategies on your current chain, including token swaps, balances, lending, and more. What would you like to do today?",
      timestamp: new Date(),
      actions: [
        { label: "Show my portfolio", action: "SHOW_PORTFOLIO" },
        { label: "Swap tokens", action: "SHOW_OPTIONS" },
        { label: "See example intents", action: "SHOW_EXAMPLES" },
      ],
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const [userTokens, setUserTokens] = useState<Token[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
      inline: "nearest",
    });
  }, [messages]);

  // Fetch user's token balances when connected
  useEffect(() => {
    const loadUserTokens = async () => {
      if (isConnected && address && chainId) {
        setIsLoadingTokens(true);
        try {
          // Fetch token balances
          const balances = await fetchUserTokenBalances(address, chainId);

          // Remove potential duplicates by symbol
          const uniqueBalances = balances.filter(
            (token, index, self) =>
              index === self.findIndex((t) => t.symbol === token.symbol)
          );

          // Fetch price data for tokens
          const tokensWithPrices = await fetchTokenPrices(uniqueBalances);

          setUserTokens(tokensWithPrices);
        } catch (error) {
          console.error("Error loading user tokens:", error);
          // Set empty tokens on error instead of sample tokens
          setUserTokens([]);
          toast.error("Failed to load token balances");
        } finally {
          setIsLoadingTokens(false);
        }
      } else {
        // Set empty tokens when not connected instead of sample tokens
        setUserTokens([]);
      }
    };

    loadUserTokens();

    // Set up a refresh interval (every 60 seconds)
    const refreshInterval = setInterval(() => {
      if (isConnected && address) {
        loadUserTokens();
      }
    }, 60000);

    return () => clearInterval(refreshInterval);
  }, [isConnected, address, chainId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Get chain-specific examples based on current chain
  const getChainSpecificExamples = (): string[] => {
    if (!chainId) return CHAIN_SPECIFIC_INTENTS.default;
    return (
      CHAIN_SPECIFIC_INTENTS[chainId.toString()] ||
      CHAIN_SPECIFIC_INTENTS.default
    );
  };

  // Get current chain name for display
  const getCurrentChainName = (): string => {
    if (!chainId) return "your current chain";

    switch (chainId) {
      case 44787:
        return "Celo Alfajores";
      case 31:
        return "Rootstock";
      case 2743859179913000:
        return "Saga IFI";
      default:
        return `Chain ${chainId}`;
    }
  };

  const getTokensForCurrentChain = (): Token[] => {
    // Return empty array instead of sample tokens
    // User must connect wallet to see tokens
    return [];
  };

  // Enhanced message processing to handle natural language intents directly
  const processMessage = (
    message: string
  ): {
    response: string;
    tokens?: Token[];
    actions?: { label: string; action: string; intent?: string }[];
  } => {
    const lowerMessage = message.toLowerCase();

    // Check for greetings
    if (
      /^(hi|hello|hey|greetings|howdy|what's up|sup|hola|good morning|good afternoon|good evening)$/i.test(
        lowerMessage.trim()
      )
    ) {
      return {
        response:
          "Hello! I'm your IntentFi financial assistant. I can help you with DeFi operations, investments, and financial strategies. What would you like to do today?",
        actions: [
          { label: "Show available functions", action: "SHOW_FUNCTIONS" },
          { label: "See example intents", action: "SHOW_EXAMPLES" },
          { label: "Show my portfolio", action: "SHOW_PORTFOLIO" },
        ],
      };
    }

    // Check if message has any financial keywords
    const hasFinancialKeywords = financialKeywords.some((keyword) =>
      lowerMessage.includes(keyword)
    );

    // If it's a general knowledge question or has no financial context
    if (
      lowerMessage.includes("who is") ||
      (lowerMessage.includes("what is") && !hasFinancialKeywords) ||
      (lowerMessage.includes("when did") && !hasFinancialKeywords) ||
      (lowerMessage.includes("where is") && !hasFinancialKeywords) ||
      (!hasFinancialKeywords && lowerMessage.includes("?"))
    ) {
      return {
        response:
          "I'm your IntentFi financial assistant, designed specifically to help with DeFi operations and financial strategies. I can't answer general knowledge questions, but I'd be happy to help with any financial queries. What would you like to know about your finances or DeFi operations?",
        actions: [
          { label: "Show available functions", action: "SHOW_FUNCTIONS" },
          { label: "See example intents", action: "SHOW_EXAMPLES" },
          { label: "Show my portfolio", action: "SHOW_PORTFOLIO" },
        ],
      };
    }

    // First try to match direct intent patterns with variable extraction
    for (const pattern of INTENT_PATTERNS) {
      const matches = message.match(pattern.pattern);
      if (matches) {
        // Extract variables if present
        const variables = pattern.extractVariables
          ? pattern.extractVariables(matches)
          : null;

        // Generate response from string or function
        let responseText = "";
        if (typeof pattern.response === "function") {
          responseText = pattern.response(matches);
        } else {
          responseText = pattern.response;
        }

        // Update actions with variables if present
        let actions = pattern.actions;
        if (variables) {
          actions = actions.map((action) => {
            if (!action.intent) return action;

            let processedIntent = action.intent;
            Object.entries(variables).forEach(([key, value]) => {
              processedIntent = processedIntent.replace(
                `[${key.toUpperCase()}]`,
                value
              );
            });
            return { ...action, intent: processedIntent };
          });
        }

        // Inside processMessage function
        // Pattern matching for tokens display
        if (pattern.tokens) {
          // Only show tokens if connected, otherwise show a prompt to connect
          responseText += isConnected
            ? " Here are your tokens:"
            : " Please connect your wallet to view your tokens.";
          return {
            response: responseText,
            tokens: pattern.tokens && isConnected ? userTokens : undefined,
            actions: [
              { label: "See example intents", action: "SHOW_EXAMPLES" },
            ],
          };
        }

        return {
          response: responseText,
          tokens: pattern.tokens ? getTokensForCurrentChain() : undefined,
          actions: actions,
        };
      }
    }

    // If no specific pattern was matched, treat it as a direct intent
    // and provide general options
    return {
      response:
        "I can help execute this intent. Would you like me to proceed with this plan?",
      actions: [
        {
          label: "Process this intent",
          action: "DIRECT_INTENT",
          intent: message,
        },
        { label: "Show me alternatives", action: "SHOW_OPTIONS" },
        { label: "See example intents", action: "SHOW_EXAMPLES" },
      ],
    };
  };

  const getDefaultToken = (): string => {
    // First check if user has tokens and return the first one
    if (userTokens.length > 0) {
      return userTokens[0].symbol;
    }

    // Fallback to chain-specific defaults
    if (!chainId) return "ETH";

    switch (chainId) {
      case 44787:
        return "CELO";
      case 31:
        return "RBTC";
      case 2743859179913000:
        return "IFI";
      default:
        return "ETH";
    }
  };

  // Define the type for pool data
  interface PoolInfo {
    poolId: number;
    stakingToken: string;
    rewardToken: string;
    rewardPerSecond: string;
    totalStaked: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
    apy: string;
  }

  const processIntent = (formattedIntent: string) => {
    // Set processing state
    setIsProcessing(true);

    // Check if this is a greeting
    const lowerIntent = formattedIntent.toLowerCase().trim();
    if (
      /^(hi|hello|hey|greetings|howdy|what's up|sup|hola|good morning|good afternoon|good evening)$/i.test(
        lowerIntent
      )
    ) {
      // Don't process greetings as intents
      setMessages((prev) => [
        ...prev.filter((msg) => !msg.isLoading),
        {
          role: "assistant",
          content:
            "Hello! I'm your IntentFi financial assistant. I can help you with DeFi operations, investments, and financial strategies. What would you like to do today?",
          timestamp: new Date(),
          actions: [
            { label: "Show available functions", action: "SHOW_FUNCTIONS" },
            { label: "See example intents", action: "SHOW_EXAMPLES" },
            { label: "Show my portfolio", action: "SHOW_PORTFOLIO" },
          ],
        },
      ]);
      setIsProcessing(false);
      return;
    }
    // Check if intent has any financial keywords
    const hasFinancialKeywords = financialKeywords.some((keyword) =>
      lowerIntent.includes(keyword)
    );

    // Handle non-financial queries
    if (
      lowerIntent.includes("who is") ||
      (lowerIntent.includes("what is") && !hasFinancialKeywords) ||
      (lowerIntent.includes("when did") && !hasFinancialKeywords) ||
      (lowerIntent.includes("where is") && !hasFinancialKeywords) ||
      (!hasFinancialKeywords && lowerIntent.includes("?"))
    ) {
      // Display error message instead of processing with backend
      setMessages((prev) => [
        ...prev.filter((msg) => !msg.isLoading),
        {
          role: "assistant",
          content:
            "I'm your IntentFi financial assistant focused on DeFi operations and financial strategies. I can't answer general knowledge questions or process non-financial intents. How can I help with your financial needs today?",
          timestamp: new Date(),
          actions: [
            { label: "Show available functions", action: "SHOW_FUNCTIONS" },
            { label: "See example intents", action: "SHOW_EXAMPLES" },
            { label: "Show my portfolio", action: "SHOW_PORTFOLIO" },
          ],
        },
      ]);
      setIsProcessing(false);
      return;
    }

    // Special case for pool info - show more detailed response
    if (formattedIntent.toLowerCase().includes("pool info")) {
      // Add a processing message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Retrieving pool information... This may take a moment.",
          timestamp: new Date(),
          isLoading: true,
        },
      ]);

      // Instead of simulating data, make an actual API call to fetch pool data
      fetchPoolInformation(getCurrentChainName().toLowerCase())
        .then((poolData) => {
          // Replace loading message with detailed pool information
          setMessages((prev) => [
            ...prev.filter((msg) => !msg.isLoading),
            {
              role: "assistant",
              content: formatPoolInformation(poolData),
              timestamp: new Date(),
              actions: [
                {
                  label: "Stake in pool 4",
                  action: "DIRECT_INTENT",
                  intent: `Stake 10 ${getDefaultToken()} in pool 4`,
                },
                { label: "View highest APY pool", action: "VIEW_BEST_POOL" },
                { label: "Clear chat", action: "CLEAR_CHAT" },
              ],
            },
          ]);
          setIsProcessing(false);
        })
        .catch((error) => {
          // Handle error
          setMessages((prev) => [
            ...prev.filter((msg) => !msg.isLoading),
            {
              role: "assistant",
              content:
                "Sorry, I couldn't retrieve pool information at this time. Please try again later.",
              timestamp: new Date(),
              actions: [
                {
                  label: "Try again",
                  action: "DIRECT_INTENT",
                  intent: "Get pool information",
                },
                { label: "Clear chat", action: "CLEAR_CHAT" },
              ],
            },
          ]);
          console.error("Error fetching pool information:", error);
          setIsProcessing(false);
        });

      return;
    }

    // Standard processing for other intents
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Processing your intent... This may take a moment.",
        timestamp: new Date(),
        isLoading: true,
      },
    ]);

    // Process the intent
    // Need to call this in a try/catch since onCreateIntent may not return a Promise
    try {
      // Call the parent component's handler
      onCreateIntent(formattedIntent);

      // Add a timeout to show the success message
      setTimeout(() => {
        // Replace loading message with completion message
        setMessages((prev) => [
          ...prev.filter((msg) => !msg.isLoading),
          {
            role: "assistant",
            content:
              "Your intent has been processed. You can view the execution plan below.",
            timestamp: new Date(),
            actions: [
              { label: "Clear chat", action: "CLEAR_CHAT" },
              { label: "Create new intent", action: "SHOW_EXAMPLES" },
            ],
          },
        ]);
        setIsProcessing(false);
      }, 2000);
    } catch (error) {
      console.error("Error processing intent:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      // Show user-friendly error message
      setMessages((prev) => [
        ...prev.filter((msg) => !msg.isLoading),
        {
          role: "assistant",
          content: `I encountered an error while processing your intent: ${errorMessage}. Please try again with a different command or check your network connection.`,
          timestamp: new Date(),
          actions: [
            { label: "See example intents", action: "SHOW_EXAMPLES" },
            { label: "Show available functions", action: "SHOW_FUNCTIONS" },
          ],
        },
      ]);
      setIsProcessing(false);
    }
  };

  // Fetch pool information from API
  const fetchPoolInformation = async (chain: string): Promise<PoolInfo[]> => {
    try {
      // In production, this would be a real API call
      // const response = await fetch(`/api/pools?chain=${chain}`);
      // if (!response.ok) throw new Error('Failed to fetch pool data');
      // const data = await response.json();
      // return data.pools;

      // For now, simulate an API call with a delay
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(generateDynamicPoolDataForChain(chain));
        }, 1500);
      });
    } catch (error) {
      console.error("Error fetching pool information:", error);
      throw error;
    }
  };

  // Generate dynamic pool data based on the chain
  const generateDynamicPoolDataForChain = (chain: string): PoolInfo[] => {
    const currentDate = new Date();
    const oneWeekLater = new Date(currentDate);
    oneWeekLater.setDate(currentDate.getDate() + 7);

    const oneMonthLater = new Date(currentDate);
    oneMonthLater.setMonth(currentDate.getMonth() + 1);

    // Chain-specific tokens configuration
    const chainTokens: {
      [key: string]: { symbol: string; name: string; baseApy: number }[];
    } = {
      celo: [
        { symbol: "CELO", name: "Celo", baseApy: 8.5 },
        { symbol: "cUSD", name: "Celo Dollar", baseApy: 6.2 },
        { symbol: "cEUR", name: "Celo Euro", baseApy: 5.9 },
        { symbol: "USDC", name: "USD Coin", baseApy: 4.7 },
        { symbol: "DAI", name: "Dai Stablecoin", baseApy: 4.5 },
        { symbol: "WBTC", name: "Wrapped Bitcoin", baseApy: 3.2 },
      ],
      rootstock: [
        { symbol: "RBTC", name: "Rootstock BTC", baseApy: 7.2 },
        { symbol: "USDT", name: "Tether", baseApy: 5.3 },
        { symbol: "USDC", name: "USD Coin", baseApy: 5.1 },
        { symbol: "DOC", name: "Dollar on Chain", baseApy: 6.8 },
        { symbol: "RIF", name: "RSK Infrastructure Framework", baseApy: 9.4 },
        { symbol: "SOV", name: "Sovryn", baseApy: 10.5 },
      ],
      saga: [
        { symbol: "IFI", name: "IntentFi", baseApy: 12.0 },
        { symbol: "USDC", name: "USD Coin", baseApy: 7.5 },
        { symbol: "USDT", name: "Tether", baseApy: 7.2 },
        { symbol: "DAI", name: "Dai Stablecoin", baseApy: 6.9 },
        { symbol: "ETH", name: "Ethereum", baseApy: 5.3 },
        { symbol: "WBTC", name: "Wrapped Bitcoin", baseApy: 4.1 },
      ],
      default: [
        { symbol: "ETH", name: "Ethereum", baseApy: 5.7 },
        { symbol: "USDC", name: "USD Coin", baseApy: 4.2 },
        { symbol: "USDT", name: "Tether", baseApy: 4.0 },
        { symbol: "DAI", name: "Dai Stablecoin", baseApy: 3.8 },
        { symbol: "WBTC", name: "Wrapped Bitcoin", baseApy: 2.5 },
        { symbol: "LINK", name: "Chainlink", baseApy: 6.3 },
      ],
    };

    // Determine which token set to use based on chain
    let tokenSet = chainTokens.default;
    if (chain.includes("celo")) tokenSet = chainTokens.celo;
    if (chain.includes("root") || chain.includes("rbtc"))
      tokenSet = chainTokens.rootstock;
    if (chain.includes("saga") || chain.includes("ifi"))
      tokenSet = chainTokens.saga;

    // Generate chain-specific APY with randomization
    const getChainSpecificApy = (baseApy: number, poolId: number): string => {
      // Add slight randomization to APY
      const variation = Math.random() * 1.5 - 0.75; // -0.75% to +0.75%
      let finalApy = baseApy + variation;

      // Boost APY for higher pool IDs (newer pools often have boosted rewards)
      finalApy += poolId * 0.4;

      // Apply chain-specific multipliers
      if (chain.includes("celo")) finalApy *= 1.2;
      if (chain.includes("root") || chain.includes("rbtc")) finalApy *= 1.1;
      if (chain.includes("saga") || chain.includes("ifi")) finalApy *= 1.5;

      return `${finalApy.toFixed(1)}%`;
    };

    // Generate realistic total staked amounts
    const getTotalStaked = (symbol: string, poolId: number): string => {
      const baseAmount =
        tokenSet.findIndex((t) => t.symbol === symbol) === 0 ? 100 : 20;
      let multiplier = 1;

      // Popular tokens have more staked
      if (["ETH", "USDC", "WBTC", "CELO", "RBTC", "IFI"].includes(symbol)) {
        multiplier = 2.5;
      }

      // Featured pools (like pool 4) have more staked
      if (poolId === 4) multiplier *= 3;
      if (poolId === 0) multiplier *= 1.5;

      const randomFactor = 0.5 + Math.random() * 1.5; // 0.5x to 2x randomization
      const stakedAmount = baseAmount * multiplier * randomFactor;

      // Format based on token type (more precision for expensive tokens)
      if (["ETH", "WBTC", "RBTC"].includes(symbol)) {
        return stakedAmount.toFixed(6);
      }
      return stakedAmount.toFixed(2);
    };

    // Generate pool data using the chain-specific tokens
    return Array.from({ length: 6 }, (_, i) => {
      // Select token for this pool - each pool uses a different token to stake
      const stakingToken = tokenSet[i % tokenSet.length];

      // For reward tokens, use a different token (typically the platform token)
      const rewardTokenIndex = i === 4 ? 0 : (i + 3) % tokenSet.length;
      const rewardToken = tokenSet[rewardTokenIndex];

      return {
        poolId: i,
        stakingToken: stakingToken.symbol,
        rewardToken: rewardToken.symbol,
        rewardPerSecond: (0.000000000000000005 * (i + 1)).toFixed(18),
        totalStaked: getTotalStaked(stakingToken.symbol, i),
        startTime:
          i === 0
            ? new Date(currentDate.getTime() + 86400000).toLocaleString()
            : currentDate.toLocaleString(),
        endTime:
          i === 0
            ? oneMonthLater.toLocaleString()
            : oneWeekLater.toLocaleString(),
        isActive: Math.random() > 0.2, // 20% chance of inactive pool
        apy: getChainSpecificApy(stakingToken.baseApy, i),
      };
    });
  };

  // Format pool information in a readable way with visual enhancements
  const formatPoolInformation = (pools: PoolInfo[]) => {
    const chainName = getCurrentChainName();

    // Sort pools by APY (descending)
    const sortedPools = [...pools].sort((a, b) => {
      const apyA = parseFloat(a.apy.replace("%", ""));
      const apyB = parseFloat(b.apy.replace("%", ""));
      return apyB - apyA;
    });

    // Find highest APY pool
    const highestApyPool = sortedPools[0];

    let formattedInfo = `## Staking Pools on ${chainName}\n\n`;
    formattedInfo += `Total Active Pools: ${
      pools.filter((p) => p.isActive).length
    } | Total Tokens Staked: ${pools
      .reduce((sum, pool) => sum + parseFloat(pool.totalStaked), 0)
      .toFixed(2)}\n\n`;

    // Highlight the best APY pool
    formattedInfo += `🔥 **Best APY:** Pool ${highestApyPool.poolId} offering ${highestApyPool.apy} for staking ${highestApyPool.stakingToken}\n\n`;

    formattedInfo += sortedPools
      .map((pool: PoolInfo) => {
        const isHighestApy = pool.poolId === highestApyPool.poolId;

        return (
          `### Pool ${pool.poolId} ${isHighestApy ? "⭐" : ""} ${
            pool.isActive ? "(Active)" : "(Inactive)"
          }\n` +
          `- **APY:** ${isHighestApy ? `**${pool.apy}**` : pool.apy}\n` +
          `- **Staking Token:** ${pool.stakingToken}\n` +
          `- **Reward Token:** ${pool.rewardToken}\n` +
          `- **Total Staked:** ${parseFloat(pool.totalStaked).toFixed(2)}\n` +
          `- **Start Date:** ${pool.startTime}\n` +
          `- **End Date:** ${pool.endTime}\n`
        );
      })
      .join("\n");

    formattedInfo += `\nTo stake tokens, try: "Stake 10 ${getDefaultToken()} in pool ${
      highestApyPool.poolId
    }"`;

    return formattedInfo;
  };

  const sendMessage = () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Check for greetings first
    const lowerIntent = input.toLowerCase().trim();
    if (
      /^(hi|hello|hey|greetings|howdy|what's up|sup|hola|good morning|good afternoon|good evening)$/i.test(
        lowerIntent
      )
    ) {
      // Handle greetings specially - don't run them as intents
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Hello! I'm your IntentFi financial assistant. I can help you with DeFi operations, investments, and financial strategies. What would you like to do today?",
          timestamp: new Date(),
          actions: [
            { label: "Show available functions", action: "SHOW_FUNCTIONS" },
            { label: "See example intents", action: "SHOW_EXAMPLES" },
            { label: "Show my portfolio", action: "SHOW_PORTFOLIO" },
          ],
        },
      ]);
      setInput("");
      return;
    }

    // Pre-process the intent to check if it's a direct function call
    let directFunctionCall = false;

    // Try to match against specific function patterns with parameters
    const depositMatch = lowerIntent.match(
      /\bdeposit\s+(\d+(?:\.\d+)?)\s+([a-zA-Z]+)/i
    );
    const withdrawMatch = lowerIntent.match(
      /\bwithdraw\s+(\d+(?:\.\d+)?)\s+([a-zA-Z]+)/i
    );
    const borrowMatch = lowerIntent.match(
      /\bborrow\s+(\d+(?:\.\d+)?)\s+([a-zA-Z]+)/i
    );
    const repayMatch = lowerIntent.match(
      /\brepay\s+(\d+(?:\.\d+)?)\s+([a-zA-Z]+)/i
    );
    const balanceMatch = lowerIntent.match(
      /\b(?:balance|check|how\s+much)\s+(?:of\s+)?([a-zA-Z]+)/i
    );
    const stakeMatch = lowerIntent.match(
      /\bstake\s+(\d+(?:\.\d+)?)\s+([a-zA-Z]+)(?:\s+in\s+pool\s+(\d+))?/i
    );
    const unstakeMatch = lowerIntent.match(
      /\bunstake\s+(\d+(?:\.\d+)?)\s+([a-zA-Z]+)(?:\s+from\s+pool\s+(\d+))?/i
    );
    const poolInfoMatch = lowerIntent.match(
      /\bpool\s+info|information|details\b/i
    );
    const swapMatch = lowerIntent.match(
      /\bswap\s+(\d+(?:\.\d+)?)\s+([a-zA-Z]+)(?:\s+(?:for|to|into)\s+([a-zA-Z]+))?/i
    );
    const exchangeMatch = lowerIntent.match(
      /\bexchange\s+(\d+(?:\.\d+)?)\s+([a-zA-Z]+)(?:\s+(?:for|to|into)\s+([a-zA-Z]+))?/i
    );
    const quoteMatch = lowerIntent.match(
      /\b(?:get|show)\s+(?:a\s+)?quote\s+(?:for\s+)?(?:swap(?:ping)?|exchang(?:ing|e))?\s+(\d+(?:\.\d+)?)\s+([a-zA-Z]+)(?:\s+(?:for|to|into)\s+([a-zA-Z]+))?/i
    );

    // Process direct function call if matched
    if (
      depositMatch ||
      withdrawMatch ||
      borrowMatch ||
      repayMatch ||
      balanceMatch ||
      stakeMatch ||
      unstakeMatch ||
      poolInfoMatch ||
      swapMatch ||
      exchangeMatch ||
      quoteMatch
    ) {
      directFunctionCall = true;

      // Create a formatted intent string that the backend will understand
      let formattedIntent = input;
      const chainName = getCurrentChainName();

      // If chain not specified in the intent, add it
      if (!lowerIntent.includes(chainName.toLowerCase())) {
        formattedIntent = `${input} on ${chainName}`;
      }

      // Add a confirmation message showing the function call
      let confirmationMessage = "";

      if (depositMatch) {
        // Ignore the full match (index 0) and use the captured groups
        const amount = depositMatch[1];
        const token = depositMatch[2];
        confirmationMessage = `I'll process your request to deposit ${amount} ${token.toUpperCase()} on ${chainName}.`;
      } else if (withdrawMatch) {
        const amount = withdrawMatch[1];
        const token = withdrawMatch[2];
        confirmationMessage = `I'll process your request to withdraw ${amount} ${token.toUpperCase()} from ${chainName}.`;
      } else if (borrowMatch) {
        const amount = borrowMatch[1];
        const token = borrowMatch[2];
        confirmationMessage = `I'll process your request to borrow ${amount} ${token.toUpperCase()} on ${chainName}.`;
      } else if (repayMatch) {
        const amount = repayMatch[1];
        const token = repayMatch[2];
        confirmationMessage = `I'll process your request to repay ${amount} ${token.toUpperCase()} on ${chainName}.`;
      } else if (balanceMatch) {
        const token = balanceMatch[1];

        // If specific token is provided, proceed with balance check
        if (token) {
          confirmationMessage = `I'll check your ${token.toUpperCase()} balance on ${chainName}.`;

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: confirmationMessage,
              timestamp: new Date(),
            },
          ]);

          // Process the intent directly
          processIntent(formattedIntent);
        } else {
          // If no specific token is provided, show available tokens for the current chain
          directFunctionCall = false; // Don't process intent yet
          const availableTokens =
            isConnected && userTokens.length > 0 ? userTokens : [];

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Which token balance would you like to check on ${chainName}? Here are your available tokens:`,
              timestamp: new Date(),
              tokens: availableTokens.map((token) => ({
                symbol: token.symbol,
                balance: token.balance,
                icon: token.icon,
                price: token.price,
              })),
              actions: availableTokens.map((token) => ({
                label: `Check ${token.symbol} balance`,
                action: "DIRECT_INTENT",
                intent: `Check my ${token.symbol} balance on ${chainName}`,
              })),
            },
          ]);
          return; // Stop here, don't continue with the rest of the function
        }
      } else if (stakeMatch) {
        const amount = stakeMatch[1];
        const token = stakeMatch[2];
        const poolId = stakeMatch[3] || "4";
        confirmationMessage = `I'll process your request to stake ${amount} ${token.toUpperCase()} in pool ${poolId} on ${chainName}.`;
      } else if (unstakeMatch) {
        const amount = unstakeMatch[1];
        const token = unstakeMatch[2];
        const poolId = unstakeMatch[3] || "4";
        confirmationMessage = `I'll process your request to unstake ${amount} ${token.toUpperCase()} from pool ${poolId} on ${chainName}.`;
      } else if (poolInfoMatch) {
        confirmationMessage = `I'll retrieve detailed pool information for ${chainName}.`;
      } else if (swapMatch) {
        const amount = swapMatch[1];
        const fromToken = swapMatch[2].toUpperCase();
        let toToken = swapMatch[3]?.toUpperCase();

        // Default to a stablecoin if no target token specified
        if (!toToken) {
          toToken = fromToken === "USDC" ? getDefaultToken() : "USDC";
        }

        const chainName = getCurrentChainName();
        confirmationMessage = `I'll process your request to swap ${amount} ${fromToken} for ${toToken} on ${chainName}.`;

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: confirmationMessage,
            timestamp: new Date(),
          },
        ]);

        // Process the swap
        handleSwapTokens(fromToken, toToken, amount).then((result) => {
          if (result.success) {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: result.message,
                timestamp: new Date(),
                actions: [
                  {
                    label: "Check balances",
                    action: "DIRECT_INTENT",
                    intent: `Check my ${toToken} balance`,
                  },
                  {
                    label: "Make another swap",
                    action: "SHOW_OPTIONS",
                  },
                ],
              },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `Error: ${result.message}`,
                timestamp: new Date(),
                actions: [
                  {
                    label: "Try again",
                    action: "DIRECT_INTENT",
                    intent: `Swap ${amount} ${fromToken} to ${toToken}`,
                  },
                  {
                    label: "Try different amounts",
                    action: "SHOW_OPTIONS",
                  },
                ],
              },
            ]);
          }
        });
      } else if (exchangeMatch) {
        const amount = exchangeMatch[1];
        const fromToken = exchangeMatch[2].toUpperCase();
        let toToken = exchangeMatch[3]?.toUpperCase();

        // Default to a stablecoin if no target token specified
        if (!toToken) {
          toToken = fromToken === "USDC" ? getDefaultToken() : "USDC";
        }

        const chainName = getCurrentChainName();
        confirmationMessage = `I'll process your request to exchange ${amount} ${fromToken} for ${toToken} on ${chainName}.`;

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: confirmationMessage,
            timestamp: new Date(),
          },
        ]);

        // Process the swap
        handleSwapTokens(fromToken, toToken, amount).then((result) => {
          if (result.success) {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: result.message,
                timestamp: new Date(),
                actions: [
                  {
                    label: "Check balances",
                    action: "DIRECT_INTENT",
                    intent: `Check my ${toToken} balance`,
                  },
                  {
                    label: "Make another exchange",
                    action: "SHOW_OPTIONS",
                  },
                ],
              },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `Error: ${result.message}`,
                timestamp: new Date(),
                actions: [
                  {
                    label: "Try again",
                    action: "DIRECT_INTENT",
                    intent: `Exchange ${amount} ${fromToken} to ${toToken}`,
                  },
                  {
                    label: "Try different amounts",
                    action: "SHOW_OPTIONS",
                  },
                ],
              },
            ]);
          }
        });
      } else if (quoteMatch) {
        const amount = quoteMatch[1];
        const fromToken = quoteMatch[2].toUpperCase();
        let toToken = quoteMatch[3]?.toUpperCase();

        // Default to a stablecoin if no target token specified
        if (!toToken) {
          toToken = fromToken === "USDC" ? getDefaultToken() : "USDC";
        }

        const chainName = getCurrentChainName();
        confirmationMessage = `Getting a quote for swapping ${amount} ${fromToken} to ${toToken} on ${chainName}...`;

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: confirmationMessage,
            timestamp: new Date(),
          },
        ]);

        // Create an async function for handling the quote
        (async () => {
          try {
            if (!address) {
              throw new Error(
                "Wallet not connected. Please connect your wallet to get a quote."
              );
            }

            const quote = await integration.getSwapQuote({
              chainId,
              provider: window.ethereum,
              address,
              inputToken: fromToken,
              outputToken: toToken,
              amount,
            });

            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `📊 **Swap Quote**\n\nSwapping ${amount} ${fromToken} will get you approximately ${
                  quote.expectedOutput
                } ${toToken}.\n\nPrice Impact: ${
                  quote.estimatedPriceImpact
                }%\nRoute: ${quote.routeDescription || "Direct"}`,
                timestamp: new Date(),
                actions: [
                  {
                    label: `Execute this swap`,
                    action: "DIRECT_INTENT",
                    intent: `Swap ${amount} ${fromToken} to ${toToken}`,
                  },
                  {
                    label: "Try different amount",
                    action: "SHOW_OPTIONS",
                  },
                ],
              },
            ]);
          } catch (error) {
            console.error("Error getting swap quote:", error);
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `Error: Unable to get a quote for this swap. ${
                  error instanceof Error ? error.message : "Please try again."
                }`,
                timestamp: new Date(),
                actions: [
                  {
                    label: "Try different tokens",
                    action: "SHOW_OPTIONS",
                  },
                ],
              },
            ]);
          }
        })(); // Immediately invoke the async function
      }

      // For all other intents, show confirmation and process immediately
      if (directFunctionCall && !balanceMatch) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: confirmationMessage,
            timestamp: new Date(),
          },
        ]);

        // Process the intent directly
        processIntent(formattedIntent);
      }
    } else if (
      lowerIntent.includes("balance") ||
      lowerIntent.includes("check") ||
      lowerIntent.includes("how much") ||
      lowerIntent.match(/^balance$/i)
    ) {
      // Handle generic balance requests that didn't match the specific pattern
      directFunctionCall = true; // Mark as handled
      const chainName = getCurrentChainName();
      const availableTokens =
        isConnected && userTokens.length > 0 ? userTokens : [];

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Which token balance would you like to check on ${chainName}?`,
          timestamp: new Date(),
          tokens: availableTokens.map((token) => ({
            symbol: token.symbol,
            balance: token.balance,
            icon: token.icon,
            price: token.price,
          })),
          actions: availableTokens.map((token) => ({
            label: `Check ${token.symbol} balance`,
            action: "DIRECT_INTENT",
            intent: `Check my ${token.symbol} balance on ${chainName}`,
          })),
        },
      ]);
    } else {
      // If it's a simple intent (no pattern matched), still pass it to intent processor
      if (
        input.length < 80 &&
        !input.includes("?") &&
        !input.includes("how") &&
        !input.includes("what")
      ) {
        processIntent(input);
        directFunctionCall = true;
      }
    }

    setInput("");

    // Only show the typing indicator and AI response for non-direct function calls
    if (!directFunctionCall) {
      setIsTyping(true);

      // Add temporary typing indicator
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          timestamp: new Date(),
          isLoading: true,
        },
      ]);

      // Process the response (simulating AI delay)
      setTimeout(() => {
        // Remove the loading message
        setMessages((prev) => prev.filter((msg) => !msg.isLoading));

        // Process the user's message
        const { response, tokens, actions } = processMessage(
          userMessage.content
        );

        // Add the real response
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response,
            timestamp: new Date(),
            tokens: tokens?.map((token) => ({
              symbol: token.symbol,
              balance: token.balance,
              icon: token.icon,
              price: token.price,
            })),
            actions: actions,
          },
        ]);

        setIsTyping(false);
      }, 1000);
    }
  };

  // Enhanced action handling with more intent processing options
  const handleAction = (action: string, intent?: string) => {
    switch (action) {
      case "SUGGEST_INTENT":
      case "DIRECT_INTENT":
        if (intent) {
          // Check if this is a greeting - if so, don't process it as an intent
          const lowerIntent = intent.toLowerCase().trim();
          if (
            /^(hi|hello|hey|greetings|howdy|what's up|sup|hola|good morning|good afternoon|good evening)$/i.test(
              lowerIntent
            )
          ) {
            // Simply respond with a greeting instead of processing
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content:
                  "Hello! I'm your IntentFi financial assistant. I can help you with DeFi operations, investments, and financial strategies. What would you like to do today?",
                timestamp: new Date(),
                actions: [
                  {
                    label: "Show available functions",
                    action: "SHOW_FUNCTIONS",
                  },
                  { label: "See example intents", action: "SHOW_EXAMPLES" },
                  { label: "Show my portfolio", action: "SHOW_PORTFOLIO" },
                ],
              },
            ]);
            return;
          }

          // If intent contains [TOKEN] placeholder, replace it with a default or first available token
          let processedIntent = intent;
          if (intent.includes("[TOKEN]")) {
            // Use userTokens instead of getTokensForCurrentChain
            const defaultToken =
              userTokens.length > 0 ? userTokens[0].symbol : "USDC";
            processedIntent = intent.replace(/\[TOKEN\]/g, defaultToken);
          }

          // If intent contains [CHAIN] placeholder, replace it with a default chain
          if (processedIntent.includes("[CHAIN]")) {
            processedIntent = processedIntent.replace(/\[CHAIN\]/g, "Ethereum");
          }

          // Add a confirmation message
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Processing intent: "${processedIntent}"`,
              timestamp: new Date(),
            },
          ]);

          // Process the intent directly
          processIntent(processedIntent);
        }
        break;

      case "CLEAR_CHAT":
        handleClearChat();
        break;

      case "SHOW_PORTFOLIO":
        // Use actual tokens or show empty state
        const portfolioTokens = userTokens;

        // Add message with token information or a prompt to connect wallet
        if (portfolioTokens.length > 0) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Here's your current portfolio${
                chainId ? ` on ${getChainName(chainId)}` : ""
              }:${isLoadingTokens ? " (refreshing...)" : ""}`,
              tokens: portfolioTokens.map((token) => ({
                symbol: token.symbol,
                balance: token.balance,
                icon: token.icon,
                price: token.price,
              })),
              timestamp: new Date(),
              actions: [
                { label: "Swap tokens", action: "SHOW_OPTIONS" },
                { label: "See example intents", action: "SHOW_EXAMPLES" },
              ],
            },
          ]);
        } else {
          // Show a message prompting to connect wallet
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: isConnected
                ? `You don't have any tokens in your wallet on the current chain.${
                    isLoadingTokens ? " Still loading..." : ""
                  }`
                : "Please connect your wallet to view your token portfolio.",
              timestamp: new Date(),
              actions: [
                { label: "See example intents", action: "SHOW_EXAMPLES" },
              ],
            },
          ]);
        }
        break;

      case "SHOW_EXAMPLES":
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Here are some example intents you can try on ${getCurrentChainName()}:`,
            timestamp: new Date(),
            actions: getChainSpecificExamples().map((example) => ({
              label: example,
              action: "DIRECT_INTENT",
              intent: example,
            })),
          },
        ]);
        break;

      case "SHOW_OPTIONS":
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Here are some popular actions you can take with IntentFi powered by GOAT SDK:",
            timestamp: new Date(),
            actions: [
              {
                label: "Swap tokens",
                action: "SUGGEST_INTENT",
                intent: `Swap 0.01 ${getDefaultToken()} for USDC`,
              },
              {
                label: "Get swap quote",
                action: "SUGGEST_INTENT",
                intent: "Get quote for swapping 10 USDC to ETH",
              },
              {
                label: "Find highest yield",
                action: "SUGGEST_INTENT",
                intent: "Find the highest yield for my assets",
              },
              {
                label: "Bridge tokens",
                action: "SUGGEST_INTENT",
                intent: "Bridge my tokens to Polygon",
              },
              {
                label: "Lend assets",
                action: "SUGGEST_INTENT",
                intent: "Lend my ETH for the best return",
              },
            ],
          },
        ]);
        break;

      case "SHOW_FUNCTIONS":
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Here are the DeFi functions available on ${getCurrentChainName()}:`,
            timestamp: new Date(),
            actions: [
              {
                label: "Deposit tokens",
                action: "EXPLAIN_FUNCTION",
                intent: "deposit",
              },
              {
                label: "Withdraw tokens",
                action: "EXPLAIN_FUNCTION",
                intent: "withdraw",
              },
              {
                label: "Borrow tokens",
                action: "EXPLAIN_FUNCTION",
                intent: "borrow",
              },
              {
                label: "Repay loans",
                action: "EXPLAIN_FUNCTION",
                intent: "repay",
              },
              {
                label: "Check balances",
                action: "EXPLAIN_FUNCTION",
                intent: "balanceof",
              },
              {
                label: "Stake tokens",
                action: "EXPLAIN_FUNCTION",
                intent: "stake",
              },
              {
                label: "Unstake tokens",
                action: "EXPLAIN_FUNCTION",
                intent: "unstake",
              },
              {
                label: "View pool info",
                action: "EXPLAIN_FUNCTION",
                intent: "getpoolinformation",
              },
              {
                label: "Swap tokens",
                action: "EXPLAIN_FUNCTION",
                intent: "swap",
              },
            ],
          },
        ]);
        break;

      case "EXPLAIN_FUNCTION":
        if (intent) {
          let explanation = "";
          let examples: string[] = [];

          switch (intent) {
            case "deposit":
              explanation =
                "Deposit your tokens into a lending pool to earn interest.";
              examples = [
                `Deposit 10 USDC on ${getCurrentChainName()}`,
                `Deposit 5 ${getDefaultToken()} into lending pool`,
              ];
              break;
            case "withdraw":
              explanation =
                "Withdraw your deposited tokens from a lending pool.";
              examples = [
                `Withdraw 5 ${getDefaultToken()} from ${getCurrentChainName()}`,
                `Take out 10 USDC from lending pool`,
              ];
              break;
            case "borrow":
              explanation =
                "Borrow tokens against your deposited collateral. Note: KYC verification is required for borrowing.";
              examples = [
                `Borrow 20 USDT on ${getCurrentChainName()}`,
                `Take a loan of 5 ${getDefaultToken()}`,
              ];
              break;
            case "repay":
              explanation = "Repay your borrowed tokens.";
              examples = [
                `Repay 10 USDT loan on ${getCurrentChainName()}`,
                `Pay back 5 ${getDefaultToken()} debt`,
              ];
              break;
            case "balanceof":
              explanation = "Check your token balance.";
              examples = [
                `Check my ${getDefaultToken()} balance`,
                `How much USDC do I have?`,
              ];
              break;
            case "stake":
              explanation = "Stake your tokens to earn staking rewards.";
              examples = [
                `Stake 10 ${getDefaultToken()} in pool 4`,
                `Stake 5 USDC`,
              ];
              break;
            case "unstake":
              explanation = "Unstake your tokens from staking pools.";
              examples = [
                `Unstake 5 ${getDefaultToken()} from pool 4`,
                `Withdraw my staked USDC`,
              ];
              break;
            case "getpoolinformation":
              explanation = "Get information about available pools.";
              examples = [
                `Get pool information on ${getCurrentChainName()}`,
                `Show me available pools`,
              ];
              break;
            case "swap":
              explanation =
                "Swap one token for another using GOAT SDK for optimal routing and pricing.";
              examples = [
                `Swap 0.1 ${getDefaultToken()} for USDC`,
                `Exchange 10 USDC for DAI`,
                `Get quote for swapping 5 ${getDefaultToken()} to USDT`,
              ];
              break;
          }

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: explanation,
              timestamp: new Date(),
              actions: [
                ...examples.map((example) => ({
                  label: example,
                  action: "DIRECT_INTENT",
                  intent: example,
                })),
                { label: "Back to functions", action: "SHOW_FUNCTIONS" },
              ],
            },
          ]);
        }
        break;

      case "VIEW_BEST_POOL":
        const defaultToken = getDefaultToken();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Let me help you stake in the highest APY pool.`,
            timestamp: new Date(),
          },
        ]);
        processIntent(`Stake 10 ${defaultToken} in highest APY pool`);
        break;

      case "CONNECT_WALLET":
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "To view your actual token balances and portfolio, please connect your wallet using the 'Connect Wallet' button in the navigation bar.",
            timestamp: new Date(),
            actions: [
              { label: "Show my portfolio", action: "SHOW_PORTFOLIO" },
              { label: "See example intents", action: "SHOW_EXAMPLES" },
            ],
          },
        ]);
        break;

      default:
        toast.error("Action not implemented yet");
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Chat cleared. How else can I assist you with your DeFi needs?",
        timestamp: new Date(),
        actions: [
          { label: "Show my portfolio", action: "SHOW_PORTFOLIO" },
          {
            label: "See example intents",
            action: "SHOW_EXAMPLES",
          },
        ],
      },
    ]);
  };

  const handleSelectToken = (token: { symbol: string; balance: string }) => {
    // Find the last intent action that has a [TOKEN] placeholder
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "assistant" && lastMessage.actions) {
      const intentAction = lastMessage.actions.find(
        (action) =>
          action.action === "SUGGEST_INTENT" &&
          action.intent?.includes("[TOKEN]")
      );

      if (intentAction && intentAction.intent) {
        const updatedIntent = intentAction.intent.replace(
          /\[TOKEN\]/g,
          token.symbol
        );

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Processing intent for your ${token.symbol}: "${updatedIntent}"`,
            timestamp: new Date(),
          },
        ]);

        // Process the intent directly
        processIntent(updatedIntent);
      }
    }
  };

  // Add a new function to handle token swaps using GOAT
  const handleSwapTokens = async (
    fromToken: string,
    toToken: string,
    amount: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      if (!isConnected || !address || !chainId) {
        return {
          success: false,
          message:
            "Wallet not connected. Please connect your wallet to proceed.",
        };
      }

      // First get a quote to show the user what they'll receive
      const quote = await integration.getSwapQuote({
        chainId,
        provider: window.ethereum,
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
        provider: window.ethereum,
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

  return (
    <div className="flex flex-col h-full max-h-[80vh] bg-gradient-to-b from-black via-zinc-950 to-black border border-orange-900/20 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(234,88,12,0.2)]">
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 p-4 border-b border-orange-800/20 flex justify-between items-center sticky top-0 z-10 backdrop-blur">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center mr-3 shadow-[0_0_8px_rgba(234,88,12,0.5)]">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h3
              className="font-medium text-white text-lg"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              IntentFi Agent
            </h3>
            <p className="text-xs text-gray-400 flex items-center">
              {isProcessing ? (
                <span className="flex items-center gap-1">
                  <span className="animate-pulse text-orange-500">•</span>{" "}
                  Processing intent...
                </span>
              ) : isTyping ? (
                <span className="flex items-center gap-1">
                  <span className="animate-pulse">•</span> Synthesizing
                  response...
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="text-orange-500">•</span> Ready for
                  instructions
                </span>
              )}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClearChat}
          className="h-8 w-8 rounded-full hover:bg-orange-950 transition-colors duration-300"
        >
          <X className="h-4 w-4 text-orange-500" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-zinc-950 to-black scrollbar-thin scrollbar-thumb-orange-900/20 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {messages.map((message, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-xl relative ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-orange-700/20 to-orange-900/20 border border-orange-600/30 shadow-[0_0_10px_rgba(234,88,12,0.1)]"
                    : "bg-gradient-to-br from-zinc-800/70 to-zinc-900/70 border border-zinc-700 shadow-lg"
                } p-5 ${
                  message.isLoading ? "min-w-[120px] min-h-[40px]" : ""
                } max-w-[85%] backdrop-blur-sm`}
              >
                {message.isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed font-light">
                      {message.content}
                    </p>

                    {/* Display tokens if available */}
                    {message.tokens && message.tokens.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 gap-3">
                        {message.tokens.map((token, tidx) => (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: tidx * 0.1 }}
                            key={tidx}
                            onClick={() => handleSelectToken(token)}
                            className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 border border-zinc-700 cursor-pointer transition-all duration-300 hover:shadow-[0_0_15px_rgba(234,88,12,0.1)] group"
                          >
                            {token.icon && (
                              <div className="relative">
                                <div className="absolute inset-0 bg-orange-500/30 rounded-full blur-md group-hover:bg-orange-500/40 transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
                                <img
                                  src={token.icon}
                                  alt={token.symbol}
                                  className="w-10 h-10 rounded-full relative z-10"
                                  onError={(e) => {
                                    // Fallback to a default image if the icon fails to load
                                    e.currentTarget.src =
                                      "https://cryptologos.cc/logos/question-mark.png";
                                  }}
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium">
                                {token.symbol}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                Balance: {token.balance}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-white text-xs leading-snug">
                                <span className="font-semibold">Price:</span> $
                                {token.price?.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                }) || "0.00"}
                              </p>
                              <p className="text-xs text-gray-400 leading-snug">
                                <span className="font-semibold">Value:</span> $
                                {(
                                  (parseFloat(token.balance) || 0) *
                                  (token.price || 0)
                                ).toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Display action buttons if available */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {message.actions.map((action, aidx) => (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: aidx * 0.1 }}
                            key={aidx}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleAction(action.action, action.intent)
                              }
                              className={`${
                                action.action === "DIRECT_INTENT"
                                  ? "bg-gradient-to-r from-orange-900/50 to-orange-950/50 border-orange-600/30 hover:bg-orange-800/30 text-orange-400"
                                  : "bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700/90"
                              } text-gray-200 flex items-center gap-1 rounded-lg transition-all duration-300 hover:shadow-[0_0_10px_rgba(234,88,12,0.15)] py-2`}
                            >
                              {action.action === "DIRECT_INTENT" ? (
                                <ZapIcon className="mr-1 h-3.5 w-3.5 text-orange-500" />
                              ) : (
                                <ArrowRight className="mr-1 h-3.5 w-3.5" />
                              )}
                              {action.label}
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    <span className="text-[10px] text-gray-500 absolute bottom-1.5 right-3 opacity-60">
                      {formatTime(message.timestamp)}
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="p-5 border-t border-orange-900/20 bg-gradient-to-b from-zinc-900/90 to-black backdrop-blur">
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your intent or question... (e.g., 'Deposit 10 USDC on Celo')"
            className="min-h-11 max-h-32 bg-zinc-800/70 border-orange-900/20 rounded-xl text-white placeholder:text-gray-400 focus:ring-1 focus:ring-orange-500/30 focus:border-orange-500/50 shadow-inner transition-all duration-300"
            disabled={isProcessing}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isProcessing}
            className={`px-3 rounded-xl ${
              input.trim() && !isProcessing
                ? "bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.3)] hover:shadow-[0_0_12px_rgba(234,88,12,0.4)]"
                : "bg-zinc-700"
            } transition-all duration-300`}
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div className="flex justify-between items-center mt-2.5">
          <p className="text-xs text-gray-500">
            {!isConnected ? (
              <span className="flex items-center gap-1">
                <PlusCircle className="h-3 w-3 text-orange-600" />
                <span className="font-light">
                  Connect wallet for personalized suggestions
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Coins className="h-3 w-3 text-orange-600" />
                <span className="font-light">
                  Powered by IntentFi Intelligence
                </span>
              </span>
            )}
          </p>

          <div className="text-[10px] text-gray-600 font-light px-2 py-1 rounded-full border border-zinc-800 bg-black/50">
            {isConnected ? "Wallet Connected" : "Not Connected"}
          </div>
        </div>
      </div>
    </div>
  );
}
