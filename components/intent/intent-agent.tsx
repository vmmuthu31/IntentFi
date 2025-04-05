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

// Sample token data - in production this would come from your API
const SAMPLE_TOKENS: Record<string, Token[]> = {
  ethereum: [
    {
      symbol: "ETH",
      name: "Ethereum",
      balance: "1.25",
      icon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
      chain: "Ethereum",
      price: 3498.21,
      change24h: 2.4,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      balance: "1250.00",
      icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
      chain: "Ethereum",
      price: 1.0,
      change24h: 0.01,
    },
    {
      symbol: "WBTC",
      name: "Wrapped Bitcoin",
      balance: "0.08",
      icon: "https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png",
      chain: "Ethereum",
      price: 66410.32,
      change24h: 1.2,
    },
  ],
  polygon: [
    {
      symbol: "MATIC",
      name: "Polygon",
      balance: "2500.50",
      icon: "https://cryptologos.cc/logos/polygon-matic-logo.png",
      chain: "Polygon",
      price: 0.56,
      change24h: -1.3,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      balance: "450.00",
      icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
      chain: "Polygon",
      price: 1.0,
      change24h: 0.0,
    },
    {
      symbol: "AAVE",
      name: "Aave",
      balance: "3.5",
      icon: "https://cryptologos.cc/logos/aave-aave-logo.png",
      chain: "Polygon",
      price: 92.45,
      change24h: 5.7,
    },
  ],
  celo: [
    {
      symbol: "CELO",
      name: "Celo",
      balance: "150.00",
      icon: "https://cryptologos.cc/logos/celo-celo-logo.png",
      chain: "Celo",
      price: 0.74,
      change24h: 3.2,
    },
    {
      symbol: "cUSD",
      name: "Celo Dollar",
      balance: "320.00",
      icon: "https://cryptologos.cc/logos/celo-dollar-cusd-logo.png",
      chain: "Celo",
      price: 1.0,
      change24h: 0.01,
    },
  ],
  arbitrum: [
    {
      symbol: "ARB",
      name: "Arbitrum",
      balance: "75.00",
      icon: "https://cryptologos.cc/logos/arbitrum-arb-logo.png",
      chain: "Arbitrum",
      price: 0.95,
      change24h: -2.1,
    },
    {
      symbol: "USDT",
      name: "Tether",
      balance: "180.00",
      icon: "https://cryptologos.cc/logos/tether-usdt-logo.png",
      chain: "Arbitrum",
      price: 1.0,
      change24h: 0.0,
    },
  ],
};

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

// Updated interfaces to include function responses
interface IntentPattern {
  pattern: RegExp;
  response: string | ((matches: RegExpMatchArray) => string);
  tokens: boolean;
  actions: {
    label: string;
    action: string;
    intent?: string;
  }[];
  extractVariables?: (matches: RegExpMatchArray) => Record<string, string>;
}

// Add more intent patterns to handle direct input
const INTENT_PATTERNS: IntentPattern[] = [
  {
    pattern: /deposit|add|put/i,
    response:
      "I can help you deposit funds. Which token would you like to deposit?",
    tokens: true,
    actions: [
      {
        label: "Deposit with max yield",
        action: "SUGGEST_INTENT",
        intent:
          "Deposit my [TOKEN] to earn the highest yield across all chains",
      },
      {
        label: "Deposit with lowest risk",
        action: "SUGGEST_INTENT",
        intent:
          "Deposit my [TOKEN] into the most secure protocol with reasonable yield",
      },
    ],
  },
  {
    pattern: /withdraw|remove|take out/i,
    response:
      "I can help you withdraw your assets. Which token would you like to withdraw?",
    tokens: true,
    actions: [
      {
        label: "Withdraw to my wallet",
        action: "SUGGEST_INTENT",
        intent: "Withdraw my [TOKEN] to my current wallet",
      },
      {
        label: "Convert to stablecoins",
        action: "SUGGEST_INTENT",
        intent: "Withdraw my [TOKEN] and convert to USDC",
      },
    ],
  },
  {
    pattern: /swap|exchange|convert/i,
    response: "I can help you swap tokens. What would you like to exchange?",
    tokens: true,
    actions: [
      {
        label: "Get best exchange rate",
        action: "SUGGEST_INTENT",
        intent: "Swap [TOKEN] for USDC at the best possible rate",
      },
      {
        label: "Swap with lowest fees",
        action: "SUGGEST_INTENT",
        intent: "Swap [TOKEN] for ETH with minimal fees",
      },
    ],
  },
  {
    pattern: /yield|interest|apy|earn/i,
    response:
      "Looking for the best yields? Here are some options for your assets:",
    tokens: true,
    actions: [
      {
        label: "Highest yield strategy",
        action: "SUGGEST_INTENT",
        intent: "Find the highest yield for my [TOKEN] across all chains",
      },
      {
        label: "Yield with insurance",
        action: "SUGGEST_INTENT",
        intent: "Earn yield on my [TOKEN] with insurance protection",
      },
    ],
  },
  {
    pattern: /stake|staking/i,
    response:
      "I can help you stake your assets for rewards. Which asset would you like to stake?",
    tokens: true,
    actions: [
      {
        label: "Best staking rewards",
        action: "SUGGEST_INTENT",
        intent: "Find the best staking rewards for my [TOKEN]",
      },
      {
        label: "Liquid staking",
        action: "SUGGEST_INTENT",
        intent: "Convert my [TOKEN] to a liquid staking derivative",
      },
    ],
  },
  {
    pattern: /bridge|transfer to|move to/i,
    response:
      "I can help you bridge your assets to different chains. Which token would you like to bridge?",
    tokens: true,
    actions: [
      {
        label: "Bridge with lowest fees",
        action: "SUGGEST_INTENT",
        intent: "Bridge my [TOKEN] to [CHAIN] with the lowest fees",
      },
      {
        label: "Fastest bridge option",
        action: "SUGGEST_INTENT",
        intent: "Find the fastest bridge to transfer my [TOKEN] to [CHAIN]",
      },
    ],
  },
  {
    pattern: /deposit (\d+) ([a-zA-Z]+)/i,
    response: ((matches: RegExpMatchArray) => {
      const amount = matches[1];
      const token = matches[2].toUpperCase();
      return `I'll help you deposit ${amount} ${token}. Which chain would you like to use?`;
    }) as IntentPattern["response"],
    tokens: true,
    actions: [
      {
        label: "Deposit on Celo",
        action: "SUGGEST_INTENT",
        intent: "Deposit [AMOUNT] [TOKEN] on Celo",
      },
      {
        label: "Deposit with best yield",
        action: "SUGGEST_INTENT",
        intent: "Deposit [AMOUNT] [TOKEN] with highest yield",
      },
    ],
    extractVariables: (matches: RegExpMatchArray) => ({
      amount: matches[1],
      token: matches[2].toUpperCase(),
    }),
  },
  {
    pattern: /borrow (\d+) ([a-zA-Z]+)/i,
    response: ((matches: RegExpMatchArray) => {
      const amount = matches[1];
      const token = matches[2].toUpperCase();
      return `I'll help you borrow ${amount} ${token}. Here are some options:`;
    }) as IntentPattern["response"],
    tokens: false,
    actions: [
      {
        label: "Borrow on Rootstock",
        action: "SUGGEST_INTENT",
        intent: "Borrow [AMOUNT] [TOKEN] on Rootstock",
      },
      {
        label: "Borrow at lowest interest",
        action: "SUGGEST_INTENT",
        intent: "Borrow [AMOUNT] [TOKEN] at lowest interest rate",
      },
    ],
    extractVariables: (matches: RegExpMatchArray) => ({
      amount: matches[1],
      token: matches[2].toUpperCase(),
    }),
  },
];

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
        "Hello! I'm your IntentFi Agent. I can help you execute DeFi strategies on your current chain. What would you like to do today?",
      timestamp: new Date(),
      actions: [
        { label: "Show my portfolio", action: "SHOW_PORTFOLIO" },
        { label: "Show available functions", action: "SHOW_FUNCTIONS" },
        { label: "See example intents", action: "SHOW_EXAMPLES" },
      ],
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isConnected } = useAccount();
  const chainId = useChainId();

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
      inline: "nearest",
    });
  }, [messages]);

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
    // Return appropriate tokens based on the chainId
    if (!chainId) return SAMPLE_TOKENS.ethereum || [];

    switch (chainId) {
      case 44787: // Celo Alfajores
        return SAMPLE_TOKENS.celo || [];
      case 31: // Rootstock
        // Since we don't have specific Rootstock tokens in our sample data,
        // we could show Ethereum tokens for now or create a custom set
        return SAMPLE_TOKENS.ethereum || [];
      case 2743859179913000: // Saga IFI
        // For Saga, we could use arbitrum as a placeholder or create custom tokens
        return SAMPLE_TOKENS.arbitrum || [];
      default:
        return SAMPLE_TOKENS.ethereum || [];
    }
  };

  // Enhanced message processing to handle natural language intents directly
  const processMessage = (
    message: string
  ): {
    response: string;
    tokens?: Token[];
    actions?: { label: string; action: string; intent?: string }[];
  } => {
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

    // Pass the intent to the parent component for processing
    onCreateIntent(formattedIntent);

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

    // Simulate processing time or make a real API call
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
    const defaultToken = getDefaultToken();
    const currentDate = new Date();
    const oneWeekLater = new Date(currentDate);
    oneWeekLater.setDate(currentDate.getDate() + 7);

    const oneMonthLater = new Date(currentDate);
    oneMonthLater.setMonth(currentDate.getMonth() + 1);

    // Generate different APYs based on chain
    const getChainSpecificApy = (poolId: number): string => {
      const baseApy = 5 + poolId * 1.5;

      // Add chain-specific multipliers
      if (chain.includes("celo")) return `${(baseApy * 1.2).toFixed(1)}%`;
      if (chain.includes("root") || chain.includes("rbtc"))
        return `${(baseApy * 1.1).toFixed(1)}%`;
      if (chain.includes("saga") || chain.includes("ifi"))
        return `${(baseApy * 1.5).toFixed(1)}%`;
      return `${baseApy.toFixed(1)}%`;
    };

    // Generate different total staked amounts
    const getTotalStaked = (poolId: number): string => {
      if (poolId === 4) return (Math.random() * 200 + 20).toFixed(6); // Popular pool
      if (poolId === 0) return (Math.random() * 50 + 10).toFixed(6); // First pool
      return (Math.random() * 10).toFixed(6); // Other pools
    };

    // Generate different staking tokens based on chain and pool
    const getStakingToken = (poolId: number): string => {
      const tokens: { [key: string]: string[] } = {
        celo: ["CELO", "cUSD", "cEUR", "USDC", "DAI", "WBTC"],
        root: ["RBTC", "USDT", "USDC", "DOC", "RIF", "SOV"],
        saga: ["IFI", "USDC", "USDT", "DAI", "ETH", "WBTC"],
        default: ["ETH", "USDC", "USDT", "DAI", "WBTC", "LINK"],
      };

      let tokenList = tokens.default;
      if (chain.includes("celo")) tokenList = tokens.celo;
      if (chain.includes("root")) tokenList = tokens.root;
      if (chain.includes("saga")) tokenList = tokens.saga;

      return poolId < tokenList.length ? tokenList[poolId] : defaultToken;
    };

    // Generate pool data
    return Array.from({ length: 6 }, (_, i) => ({
      poolId: i,
      stakingToken: getStakingToken(i),
      rewardToken: i === 4 ? defaultToken : getStakingToken((i + 3) % 6),
      rewardPerSecond: (0.000000000000000005 * (i + 1)).toFixed(18),
      totalStaked: getTotalStaked(i),
      startTime:
        i === 0
          ? new Date(currentDate.getTime() + 86400000).toLocaleString()
          : currentDate.toLocaleString(),
      endTime:
        i === 0
          ? oneMonthLater.toLocaleString()
          : oneWeekLater.toLocaleString(),
      isActive: Math.random() > 0.2, // 20% chance of inactive pool
      apy: getChainSpecificApy(i),
    }));
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

    // Pre-process the intent to check if it's a direct function call
    const lowerIntent = input.toLowerCase();
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

    // Process direct function call if matched
    if (
      depositMatch ||
      withdrawMatch ||
      borrowMatch ||
      repayMatch ||
      balanceMatch ||
      stakeMatch ||
      unstakeMatch ||
      poolInfoMatch
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
        confirmationMessage = `I'll check your ${
          token ? token.toUpperCase() : getDefaultToken()
        } balance on ${chainName}.`;
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
      }

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
          // If intent contains [TOKEN] placeholder, replace it with a default or first available token
          let processedIntent = intent;
          if (intent.includes("[TOKEN]")) {
            const tokens = getTokensForCurrentChain();
            const defaultToken = tokens.length > 0 ? tokens[0].symbol : "USDC";
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
        // Show all tokens across all chains
        const allTokens: Token[] = [
          ...SAMPLE_TOKENS.ethereum,
          ...SAMPLE_TOKENS.polygon,
          ...SAMPLE_TOKENS.celo,
          ...SAMPLE_TOKENS.arbitrum,
        ];

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Here's your current portfolio across all chains:",
            timestamp: new Date(),
            tokens: allTokens.map((token) => ({
              symbol: token.symbol,
              balance: token.balance,
              icon: token.icon,
              price: token.price,
            })),
            actions: [
              {
                label: "Optimize my portfolio",
                action: "SUGGEST_INTENT",
                intent:
                  "Optimize my portfolio for maximum yield with moderate risk",
              },
              {
                label: "Rebalance assets",
                action: "SUGGEST_INTENT",
                intent: "Rebalance my portfolio to 50% stablecoins and 50% ETH",
              },
            ],
          },
        ]);
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
              "Here are some popular actions you can take with IntentFi:",
            timestamp: new Date(),
            actions: [
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
                label: "Swap tokens",
                action: "SUGGEST_INTENT",
                intent: "Swap ETH for USDC",
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
              explanation = "Borrow tokens against your deposited collateral.";
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
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
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
                            {token.price && (
                              <div className="text-right">
                                <p className="text-white font-medium">
                                  $
                                  {token.price.toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                                <p className="text-xs text-gray-400">
                                  $
                                  {(
                                    parseFloat(token.balance) * token.price
                                  ).toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                            )}
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
