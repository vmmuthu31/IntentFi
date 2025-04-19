import { financialKeywords } from "@/lib/services/financialKeywords";
import { INTENT_PATTERNS } from "@/lib/services/intent_patterns";
import { Token } from "./token-utils";

export interface Message {
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

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// Enhanced message processing to handle natural language intents directly
export const processMessage = (
  message: string,
  userTokens: Token[],
  isConnected: boolean,
  getTokensForCurrentChain: () => Token[]
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

      // Pattern matching for tokens display
      if (pattern.tokens) {
        // Only show tokens if connected, otherwise show a prompt to connect
        responseText += isConnected
          ? " Here are your tokens:"
          : " Please connect your wallet to view your tokens.";
        return {
          response: responseText,
          tokens: pattern.tokens && isConnected ? userTokens : undefined,
          actions: [{ label: "See example intents", action: "SHOW_EXAMPLES" }],
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
