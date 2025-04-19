"use client";

import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useAccount, useChainId } from "wagmi";
import { toast } from "sonner";
import { integration } from "@/lib/services/integration";
import { financialKeywords } from "@/lib/services/financialKeywords";
import {
  fetchUserTokenBalances,
  fetchTokenPrices,
  getChainName,
} from "./utils/token-utils";
import { CHAIN_SPECIFIC_INTENTS } from "./utils/intent-examples";
import {
  fetchPoolInformation,
  formatPoolInformation,
} from "./utils/pool-utils";
import { Message, processMessage } from "./utils/message-utils";
import { handleSwapTokens } from "./utils/swap-utils";
import { Token } from "./utils/token-utils";
import { AgentHeader } from "./ui/AgentHeader";
import { MessageItem } from "./ui/MessageItem";
import { InputArea } from "./ui/InputArea";

export interface IntentAgentProps {
  onCreateIntent: (intent: string) => void;
}

export default function IntentAgent({ onCreateIntent }: IntentAgentProps) {
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
          const balances = await fetchUserTokenBalances(
            address,
            chainId,
            window.ethereum,
            integration.getTokenBalancesWithGoat
          );

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
              content: formatPoolInformation(poolData, getDefaultToken),
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
          setInput("");
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
      } else if (swapMatch || exchangeMatch) {
        const matches = swapMatch || exchangeMatch;
        if (matches) {
          const amount = matches[1];
          const fromToken = matches[2].toUpperCase();
          let toToken = matches[3]?.toUpperCase();

          // Default to a stablecoin if no target token specified
          if (!toToken) {
            toToken = fromToken === "USDC" ? getDefaultToken() : "USDC";
          }

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
          if (isConnected && address && chainId) {
            handleSwapTokens(
              integration,
              fromToken,
              toToken,
              amount,
              chainId,
              window.ethereum,
              address,
              isConnected
            ).then((result) => {
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
          }
        }
      } else if (quoteMatch) {
        const amount = quoteMatch[1];
        const fromToken = quoteMatch[2].toUpperCase();
        let toToken = quoteMatch[3]?.toUpperCase();

        // Default to a stablecoin if no target token specified
        if (!toToken) {
          toToken = fromToken === "USDC" ? getDefaultToken() : "USDC";
        }

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
      if (
        directFunctionCall &&
        !balanceMatch &&
        !swapMatch &&
        !exchangeMatch &&
        !quoteMatch
      ) {
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
          userMessage.content,
          userTokens,
          isConnected,
          getTokensForCurrentChain
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

  return (
    <div className="flex flex-col h-full max-h-[80vh] bg-gradient-to-b from-black via-zinc-950 to-black border border-orange-900/20 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(234,88,12,0.2)]">
      <AgentHeader
        isProcessing={isProcessing}
        isTyping={isTyping}
        handleClearChat={handleClearChat}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-zinc-950 to-black scrollbar-thin scrollbar-thumb-orange-900/20 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {messages.map((message, idx) => (
            <MessageItem
              key={idx}
              message={message}
              handleAction={handleAction}
              handleSelectToken={handleSelectToken}
            />
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <InputArea
        input={input}
        isProcessing={isProcessing}
        isConnected={isConnected}
        handleInputChange={handleInputChange}
        handleKeyDown={handleKeyDown}
        sendMessage={sendMessage}
      />
    </div>
  );
}
