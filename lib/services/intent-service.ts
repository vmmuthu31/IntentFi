/**
 * Intent Service
 *
 * This service handles the processing of natural language intents
 * using AI models (Claude and OpenAI as fallback) to generate execution plans.
 */

import { apiConfig } from "@/app/api/config";
import { integration } from "./integration";

export interface IntentStep {
  description: string;
  chain: string;
  transactionHash?: string;
  requiresKyc?: boolean;
  redirectUrl?: string;
  userAddress?: string;
  chainId?: string;
}

export interface IntentExecutionPlan {
  steps: IntentStep[];
  requiresKyc?: boolean;
}

/**
 * Process a natural language intent and generate an execution plan
 *
 * @param intent The user's natural language intent string
 * @param chainId The chain ID to process the intent on
 * @param userAddress The user's wallet address for KYC verification checks
 * @returns Promise resolving to an execution plan
 */
export async function processIntent(
  intent: string,
  chainId: number,
  userAddress?: string
): Promise<IntentExecutionPlan> {
  try {
    const claudeResult = await processWithClaude(intent, chainId, userAddress);
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
async function processWithClaude(
  intent: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  chainId: number,
  userAddress?: string
): Promise<IntentExecutionPlan> {
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
    {"chain": "Chain name or 'Multiple' or 'N/A'", "token": "Token name or 'N/A'", chainId: "Chain ID or 'N/A'", "amount": "Amount or 'N/A'", "function": "Function name or 'N/A' only take it in small letters", "poolId": "Pool ID or 4" if no pool id is provided take 4 as the value},
  ],
}

Make your responses practical and realistic. For execution steps, consider:
1. Use this information to identify the chainId:
const NETWORK_CONFIGS = {
  rootstock: {
    chainId: 31,
    chain: rootstockTestnet,
    name: "Rootstock Testnet",
    network: "rootstock",
    rpcUrl: "https://public-node.testnet.rsk.co",
    contractAddresses: {
      PriceOracle: "0xc6C9FE196408c0Ade5F394d930cF90Ebab66511e",
      LendingPool: "0x60b588582b8308b9b41966fBd38821F31AA06537",
      YieldFarming: "0x2B65Eba61bac37Ae872bEFf9d1932129B0ed24ee",
      DeFIPlatform: "0x653c13Fb7C1E5d855448af2A385F2D97a623384E",
      Token: {
        RBTC: "0x86E47CBf56d01C842AC036A56C8ea2fE0168a2D1",
        USDT: "0x14b1c5415C1164fB09450c9e46a00D5C39e52644",
      },
    },
  },
  celoAlfajores: {
    chainId: 44787,
    chain: celoAlfajores,
    name: "celoAlfajores",
    network: "celo-alfajores",
    rpcUrl: process.env.RPC_URL,
    nativeCurrency: {
      decimals: 18,
      name: "CELO",
      symbol: "CELO",
    },
    contractAddresses: {
      PriceOracle: "0x308b659C3B437cFB4F54573E9C3C03acEb8B5205",
      LendingPool: "0x884184a9aFb1B8f44fAd1C74a63B739A7c82801D",
      YieldFarming: "0xa2AE5cB0B0E23f710887BE2676F1381fb9e4fe44",
      DeFIPlatform: "0x649f3f2F4aB598272f2796401968ed74CBeA948c",
      Token: {
        USDC: "0xB1edE574409Af70267E37F368Ffa4eC427F5eE73",
        CELO: "0xb2CfbF986e91beBF31f31CCf41EDa83384c3e7d5",
        USDT: "0x50ef9155718e4b69972ebd7feb7d6d554169e6d2",
      },
    },
  }
};
2. check if the chainId is valid and the user given and the NETWORK_CONFIGS should be same the user current chainId: "${chainId}"
3. Chekck if the user has given you token name, Amount and chainId
4. Identify the function of the intent by looking for specific keywords:
   - For balance checks: Use function "balanceof" if the intent contains words like "balance", "how much", "check my", "how many", "see my", "view my"
   - For deposits: Use function "deposit" if the intent contains words like "deposit", "add", "put in", "transfer to", "send to", "invest"
   - For withdrawals: Use function "withdraw" if the intent contains words like "withdraw", "take out", "remove", "get back", "pull out", "transfer from"
   - For borrowing: Use function "borrow" if the intent contains words like "borrow", "take a loan", "get a loan", "lend me", "loan me"
   - For repayments: Use function "repay" if the intent contains words like "repay", "pay back", "return", "settle", "clear debt"
   - For getting pool information: Use function "getPoolInformation" if the intent contains words like "get pools", "pool information", "pool details", "pool data", or "get liquidity".
   - For staking: Use function "stake" if the intent contains words like "stake", "invest", "lock up", "put into", "commit to", "yield"
   - For unstaking: Use function "unstake" if the intent contains words like "unstake", "stake withdraw", "remove from stake", "take out of stake"
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
    console.log("Claude response content:", responseContent);

    try {
      const parsedContent = JSON.parse(responseContent);

      if (!parsedContent.steps || !Array.isArray(parsedContent.steps)) {
        throw new Error("Claude response is missing required fields");
      }

      const step = parsedContent.steps[0];
      const chain = step.chain;
      const token = step.token;
      let chainId = step.chainId; // This is a string from Claude's response
      const amount = step.amount;
      const functionName = step.function;
      const poolId = step.poolId;

      // Add userAddress to the step for KYC verification
      step.userAddress = userAddress;

      // Fix chainId mapping - Claude sometimes returns mainnet chainIds instead of testnet ones
      if (chain && chain.toLowerCase().includes("celo")) {
        // Force Celo Alfajores chainId regardless of what Claude returned
        chainId = "44787";
        step.chainId = chainId; // Update the step object with corrected chainId
        console.log("Fixed chainId for Celo Alfajores to 44787");
      } else if (chain && chain.toLowerCase().includes("rootstock")) {
        // Force Rootstock testnet chainId
        chainId = "31";
        step.chainId = chainId; // Update the step object with corrected chainId
        console.log("Fixed chainId for Rootstock testnet to 31");
      }

      console.log("Parsed step:", step);
      console.log("Parsed chain:", chain);
      console.log("Parsed token:", token);
      console.log("Parsed chainId:", chainId);
      console.log("Parsed amount:", amount);
      console.log("Parsed functionName:", functionName);
      console.log("Parsed poolId:", poolId);
      let result;

      if (functionName == "deposit") {
        const numericChainId = parseInt(chainId, 10);

        try {
          const depositResult = await integration.deposit({
            chainId: numericChainId,
            token,
            amount,
          });

          result = {
            steps: [
              {
                description: `Deposited ${amount} ${token} on ${chain}.`,
                transactionHash: depositResult.transactionHash,
                status: depositResult.success ? "succeeded" : "failed",
                chain,
              },
            ],
          };
        } catch (error) {
          console.error("Error during deposit operation:", error);
          // Create a user-friendly error message
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error occurred during deposit";

          result = {
            steps: [
              {
                description: `Failed to deposit ${amount} ${token} on ${chain}. Error: ${errorMessage}`,
                status: "failed",
                chain,
              },
            ],
            error: errorMessage,
          };
        }
      } else if (functionName == "withdraw") {
        const numericChainId = parseInt(chainId, 10);

        try {
          const withdrawResult = await integration.withdraw({
            chainId: numericChainId,
            token,
            amount,
          });

          result = {
            steps: [
              {
                description: `Withdrew ${amount} ${token} from ${chain}.`,
                transactionHash: withdrawResult.transactionHash,
                status: withdrawResult.success ? "succeeded" : "failed",
                chain,
              },
            ],
          };
        } catch (error) {
          console.error("Error during withdraw operation:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error occurred during withdrawal";

          result = {
            steps: [
              {
                description: `Failed to withdraw ${amount} ${token} from ${chain}. Error: ${errorMessage}`,
                status: "failed",
                chain,
              },
            ],
            error: errorMessage,
          };
        }
      } else if (functionName == "balanceof") {
        const numericChainId = parseInt(chainId, 10);

        try {
          const balanceResult = await integration.getTokenBalance({
            chainId: numericChainId,
            token,
          });

          const formattedBalance = BigInt(balanceResult).toString();

          result = {
            steps: [
              {
                description: `Checked balance of ${token} on ${chain} is ${formattedBalance}.`,
                chain,
              },
            ],
            details: {
              token,
              balance: formattedBalance,
              chainId: numericChainId,
            },
          };
        } catch (error) {
          console.error("Error during balance check:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error occurred when checking balance";

          result = {
            steps: [
              {
                description: `Failed to check balance of ${token} on ${chain}. Error: ${errorMessage}`,
                status: "failed",
                chain,
              },
            ],
            error: errorMessage,
          };
        }
      } else if (functionName === "borrow") {
        const numericChainId = parseInt(chainId, 10);

        // Check if user is KYC verified before allowing borrowing
        const isKycVerified = await checkUserKycStatus(step.userAddress);

        if (!isKycVerified) {
          // Return a special response indicating KYC verification is required
          return {
            steps: [
              {
                description: `KYC verification required to borrow ${amount} ${token} on ${chain}.`,
                chain,
                requiresKyc: true,
                redirectUrl: "/verify?redirect=/intent",
              },
            ],
            requiresKyc: true,
          };
        }

        try {
          const borrowResult = await integration.borrow({
            chainId: numericChainId,
            token,
            amount,
          });

          result = {
            steps: [
              {
                description: `Borrowed ${amount} ${token} on ${chain}.`,
                transactionHash: borrowResult.transactionHash,
                status: borrowResult.success ? "succeeded" : "failed",
                chain,
              },
            ],
            details: {
              receipt: borrowResult.receipt,
            },
          };
        } catch (error) {
          console.error("Error during borrowing operation:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error occurred during borrowing";

          result = {
            steps: [
              {
                description: `Failed to borrow ${amount} ${token} on ${chain}. Error: ${errorMessage}`,
                status: "failed",
                chain,
              },
            ],
            error: errorMessage,
          };
        }
      } else if (functionName == "repay") {
        const numericChainId = parseInt(chainId, 10);

        try {
          const repayResult = await integration.repay({
            chainId: numericChainId,
            token,
            amount,
          });

          result = {
            steps: [
              {
                description: `Repaid ${amount} ${token} on ${chain}.`,
                transactionHash: repayResult.transactionHash,
                status: repayResult.success ? "succeeded" : "failed",
                chain,
              },
            ],
          };
        } catch (error) {
          console.error("Error during repay operation:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error occurred during repayment";

          result = {
            steps: [
              {
                description: `Failed to repay ${amount} ${token} on ${chain}. Error: ${errorMessage}`,
                status: "failed",
                chain,
              },
            ],
            error: errorMessage,
          };
        }
      } else if (functionName == "stake") {
        const numericChainId = parseInt(chainId, 10);

        try {
          const stakeResult = await integration.stake({
            chainId: numericChainId,
            poolId,
            amount,
          });

          result = {
            steps: [
              {
                description: `Staked ${amount} into pool ${poolId} on ${chain}.`,
                transactionHash: stakeResult.transactionHash,
                status: stakeResult.success ? "succeeded" : "failed",
                chain,
              },
            ],
          };
        } catch (error) {
          console.error("Error during staking operation:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error occurred during staking";

          result = {
            steps: [
              {
                description: `Failed to stake ${amount} into pool ${poolId} on ${chain}. Error: ${errorMessage}`,
                status: "failed",
                chain,
              },
            ],
            error: errorMessage,
          };
        }
      } else if (functionName == "unstake") {
        const numericChainId = parseInt(chainId, 10);

        try {
          const unstakeResult = await integration.unstake({
            chainId: numericChainId,
            poolId,
            amount,
          });

          result = {
            steps: [
              {
                description: `Unstaked ${amount} from pool ${poolId} on ${chain}.`,
                transactionHash: unstakeResult.transactionHash,
                status: unstakeResult.success ? "succeeded" : "failed",
                chain,
              },
            ],
            details: {
              token: unstakeResult,
              receipt: unstakeResult.receipt,
            },
          };
        } catch (error) {
          console.error("Error during unstaking operation:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error occurred during unstaking";

          result = {
            steps: [
              {
                description: `Failed to unstake ${amount} from pool ${poolId} on ${chain}. Error: ${errorMessage}`,
                status: "failed",
                chain,
              },
            ],
            error: errorMessage,
          };
        }
      } else if (functionName == "getpoolinformation") {
        const numericChainId = parseInt(chainId, 10);

        try {
          const pools = await integration.getPoolInformation({
            chainId: numericChainId,
          });

          result = {
            steps: [
              {
                description: `Retrieved information for ${pools.length} pools on ${chain}.`,
                data: pools,
                chain,
              },
            ],
            data: pools,
          };
        } catch (error) {
          console.error("Error retrieving pool information:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error occurred when retrieving pool information";

          result = {
            steps: [
              {
                description: `Failed to retrieve pool information on ${chain}. Error: ${errorMessage}`,
                status: "failed",
                chain,
              },
            ],
            error: errorMessage,
          };
        }
      } else {
        result = {
          steps: [
            {
              description: `Unknown operation: ${functionName} with ${amount} ${token} on ${chain}`,
              chain,
            },
          ],
        };
      }

      return result as IntentExecutionPlan;
    } catch (parseError) {
      console.error("Error parsing Claude response:", parseError);
      throw parseError;
    }
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

/**
 * Check if a user has completed KYC verification
 * @param userAddress The user's wallet address
 * @returns Promise resolving to boolean indicating if user is verified
 */
async function checkUserKycStatus(userAddress?: string): Promise<boolean> {
  // Use the connected wallet address from the account property if not provided
  try {
    // Check if we're in a server environment (Next.js API route)
    // This is needed because fetch behaves differently in server vs client
    const isServer = typeof window === "undefined";

    if (!userAddress) {
      console.warn(
        "No userAddress provided for KYC check, defaulting to true for demo purposes"
      );
      return true; // Allow borrow for demo purposes when no address is provided
    }

    // Normalize the address
    const normalizedAddress = userAddress.toLowerCase();

    // Always approve these test addresses
    if (
      normalizedAddress === "0x1234567890123456789012345678901234567890" ||
      normalizedAddress === "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    ) {
      console.log(
        `Test address detected: ${normalizedAddress}, automatically approving KYC`
      );
      return true;
    }

    // Use full URL with proper origin for server-side calls
    // For client-side, we can use relative URLs
    const apiUrl = isServer
      ? `${
          process.env.NEXT_PUBLIC_API_URL || "https://intentfi.vercel.app"
        }/api/user/verification?address=${normalizedAddress}`
      : `/api/user/verification?address=${normalizedAddress}`;

    console.log(
      `Checking KYC status for address ${normalizedAddress} using endpoint: ${apiUrl}`
    );

    // Add debug timestamp to avoid caching issues
    const timestamp = Date.now();
    const response = await fetch(`${apiUrl}&_t=${timestamp}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store",
      },
    });

    if (!response.ok) {
      console.warn(`Verification check failed: ${response.status}`);
      // In development mode, allow borrowing even if verification check fails
      if (process.env.NODE_ENV === "development") {
        console.log("Development mode: bypassing verification requirement");
        return true;
      }
      return false;
    }

    const data = await response.json();
    console.log(`KYC verification response for ${normalizedAddress}:`, data);

    if (data.isVerified) {
      console.log(`User ${normalizedAddress} is KYC verified`);
      return true;
    } else {
      console.log(`User ${normalizedAddress} is NOT KYC verified`);

      // For development mode, auto-approve after user has attempted verification once
      if (process.env.NODE_ENV === "development") {
        console.log(
          "Development mode: auto-approving user after verification attempt"
        );

        try {
          // Auto-approve the user in development mode
          await fetch(`/api/user/verification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache, no-store",
            },
            body: JSON.stringify({
              address: normalizedAddress,
              isVerified: true,
              verificationData: {
                timestamp: new Date().toISOString(),
                source: "auto_approved_dev",
              },
            }),
          });

          console.log(
            `Development mode: User ${normalizedAddress} auto-approved`
          );
          return true;
        } catch (autoApproveError) {
          console.error("Error auto-approving user:", autoApproveError);
          return true; // Still allow borrowing in development
        }
      }

      return false;
    }
  } catch (error) {
    console.error("Error checking KYC status:", error);
    // For development purposes only - always approve if check fails
    if (process.env.NODE_ENV === "development") {
      console.log(
        "Development mode - bypassing verification check due to error"
      );
      return true;
    }
    return false;
  }
}
