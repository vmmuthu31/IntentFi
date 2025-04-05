/**
 * Intent Service
 *
 * This service handles the processing of natural language intents
 * using AI models (Claude and OpenAI as fallback) to generate execution plans.
 */

import { apiConfig } from "@/app/api/config";

export interface IntentStep {
  description: string;
  chain: string;
}

export interface IntentExecutionPlan {
  steps: IntentStep[];
}

/**
 * Process a natural language intent and generate an execution plan
 *
 * @param intent The user's natural language intent string
 * @returns Promise resolving to an execution plan
 */
export async function processIntent(
  intent: string
): Promise<IntentExecutionPlan> {
  try {
    const claudeResult = await processWithClaude(intent);
    return claudeResult;
  } catch (error) {
    console.error(
      "Claude intent processing failed, falling back to OpenAI:",
      error
    );
    return processWithOpenAI(intent);
  }
}

/**
 * Process intent using Anthropic's Claude
 */
async function processWithClaude(intent: string): Promise<IntentExecutionPlan> {
  try {
    const response = await fetch(`${apiConfig.claude.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiConfig.claude.apiKey,
        "anthropic-version": apiConfig.claude.version,
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `You are the AI for a cross-chain DeFi intent system. I'll give you a financial intent in natural language, and you'll return a structured JSON object with the execution steps, estimated cost, and time.

The JSON should have this format:
{
  "steps": [
    {"description": "Step description", "chain": "Chain name or 'Multiple' or 'N/A'"}
  ],
}

Make your responses practical and realistic. For execution steps, consider:
1. Checking balances, rates, or routes first
2. Any bridging between chains
3. Swapping tokens if needed
4. Depositing into protocols or setting up automation
5. Any monitoring or follow-up steps

Here's my intent: "${intent}"

Return ONLY the JSON with no other text.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Claude API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    const responseContent = data.content[0].text;

    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from Claude response");
    }

    const parsedJson = JSON.parse(jsonMatch[0]);

    if (!parsedJson.steps || !Array.isArray(parsedJson.steps)) {
      throw new Error("Claude response is missing required fields");
    }

    return parsedJson as IntentExecutionPlan;
  } catch (error) {
    console.error("Error processing with Claude:", error);
    throw error;
  }
}

/**
 * Process intent using OpenAI models
 */
async function processWithOpenAI(intent: string): Promise<IntentExecutionPlan> {
  try {
    const response = await fetch(
      `${apiConfig.openai.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiConfig.openai.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are an expert AI for a cross-chain DeFi intent system. Given a financial intent in natural language, return a structured JSON object with execution steps, estimated cost, and time. The response must be ONLY a valid JSON object with no other text, and have this exact format:
{
  "steps": [
    {"description": "Step description", "chain": "Chain name or 'Multiple' or 'N/A'"}
  ]
}

Make your responses practical and realistic. For execution steps, consider:
1. Checking balances, rates, or routes first
2. Any bridging between chains
3. Swapping tokens if needed
4. Depositing into protocols or setting up automation
5. Any monitoring or follow-up steps`,
            },
            {
              role: "user",
              content: `Intent: "${intent}"`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    try {
      const parsedJson = JSON.parse(data.choices[0].message.content);

      if (
        !parsedJson.steps ||
        !Array.isArray(parsedJson.steps) ||
        !parsedJson.estimatedCost ||
        !parsedJson.estimatedTime
      ) {
        throw new Error("OpenAI response is missing required fields");
      }

      return parsedJson as IntentExecutionPlan;
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error processing with OpenAI:", error);
    return simulateIntentProcessing(intent);
  }
}

/**
 * Mock function to simulate intent processing for demo purposes
 * Used as a last resort if both Claude and OpenAI fail
 */
function simulateIntentProcessing(intent: string): IntentExecutionPlan {
  const lowerIntent = intent.toLowerCase();

  if (
    lowerIntent.includes("yield") ||
    lowerIntent.includes("earn") ||
    lowerIntent.includes("apy")
  ) {
    return {
      steps: [
        {
          description: "Check current USDC balances across chains",
          chain: "Multiple",
        },
        {
          description: "Query yield rates across DeFi protocols",
          chain: "Multiple",
        },
        {
          description: "Bridge 3,000 USDC from Ethereum to Polygon",
          chain: "Ethereum → Polygon",
        },
        {
          description: "Deposit 3,000 USDC into Aave on Polygon",
          chain: "Polygon",
        },
        { description: "Set up monitoring for better rates", chain: "N/A" },
      ],
    };
  } else if (
    lowerIntent.includes("diversif") ||
    lowerIntent.includes("portfolio") ||
    lowerIntent.includes("convert") ||
    lowerIntent.includes("bitcoin") ||
    lowerIntent.includes("btc")
  ) {
    return {
      steps: [
        { description: "Check current Bitcoin balance", chain: "Bitcoin" },
        { description: "Calculate 50% of current BTC holdings", chain: "N/A" },
        {
          description: "Bridge BTC to Ethereum via Portal Bridge",
          chain: "Bitcoin → Ethereum",
        },
        { description: "Exchange 20% for ETH on Ethereum", chain: "Ethereum" },
        {
          description: "Bridge 15% to Polygon and swap for MATIC",
          chain: "Ethereum → Polygon",
        },
        {
          description: "Bridge 10% to Avalanche and swap for AVAX",
          chain: "Ethereum → Avalanche",
        },
        {
          description: "Bridge 5% to Celo and swap for CELO",
          chain: "Ethereum → Celo",
        },
      ],
    };
  } else if (
    lowerIntent.includes("every") ||
    lowerIntent.includes("weekly") ||
    lowerIntent.includes("when") ||
    lowerIntent.includes("condition") ||
    lowerIntent.includes("rsi")
  ) {
    return {
      steps: [
        {
          description: "Setup conditional intent smart contract",
          chain: "Ethereum",
        },
        {
          description: "Configure RSI data feed from Chainlink",
          chain: "Ethereum",
        },
        {
          description: "Set weekly trigger (Fridays) with RSI < 40 condition",
          chain: "N/A",
        },
        {
          description: "Authorize weekly USDC allowance of $200",
          chain: "Ethereum",
        },
        {
          description: "Set notification preferences for execution",
          chain: "N/A",
        },
      ],
    };
  } else if (
    lowerIntent.includes("gas") ||
    lowerIntent.includes("move") ||
    lowerIntent.includes("transfer") ||
    lowerIntent.includes("bridge")
  ) {
    return {
      steps: [
        {
          description: "Analyze current asset positions on Ethereum",
          chain: "Ethereum",
        },
        {
          description: "Estimate gas savings by moving to Polygon",
          chain: "N/A",
        },
        {
          description: "Batch assets for efficient bridging",
          chain: "Ethereum",
        },
        {
          description: "Bridge ETH for Polygon gas via Hyperlane",
          chain: "Ethereum → Polygon",
        },
        {
          description: "Bridge remaining assets via Circle CCTP",
          chain: "Ethereum → Polygon",
        },
        {
          description: "Setup gas-free transactions via Paymaster",
          chain: "Polygon",
        },
      ],
    };
  } else {
    return {
      steps: [
        { description: "Analyze intent requirements", chain: "N/A" },
        {
          description: "Optimize cross-chain execution path",
          chain: "Multiple",
        },
        { description: "Prepare transaction sequence", chain: "Multiple" },
        { description: "Execute primary transactions", chain: "Multiple" },
        { description: "Monitor and confirm completion", chain: "N/A" },
      ],
    };
  }
}
