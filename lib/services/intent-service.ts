/**
 * Intent Service
 *
 * This service handles the processing of natural language intents
 * using AI models (Claude and OpenAI as fallback) to generate execution plans.
 */

import { apiConfig } from "@/app/api/config";
import {
  getTokenBalance,
  getAllowance,
  getTotalSupply,
  transferTokens,
  approveTokens,
  convertToBaseUnit,
  convertFromBaseUnit,
} from "./integration";
import { ethers } from "ethers";

export interface IntentStep {
  description: string;
  chain: string;
  transactionHash?: string;
  requiresKyc?: boolean;
  requiresWalletConnect?: boolean;
  redirectUrl?: string;
  userAddress?: string;
  chainId?: string;
  status?: string;
  details?: Record<string, string | number | boolean | object>;
}

export interface IntentExecutionPlan {
  steps: IntentStep[];
  requiresKyc?: boolean;
  requiresWalletConnect?: boolean;
  requiresUserInput?: boolean;
  details?: Record<string, string | number | boolean | object>;
  error?: string;
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
    {"chain": "Chain name or 'Multiple' or 'N/A'", "token": "Token name or 'N/A'", chainId: "Chain ID or 'N/A'", "amount": "Amount or 'N/A'", "function": "Function name or 'N/A' only take it in small letters", "to": "Recipient address for transfers"}
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
  },
  celoAlfajores: {
    chainId: 44787,
    chain: celoAlfajores,
    name: "celoAlfajores",
    network: "celo-alfajores",
    rpcUrl: process.env.CELO_RPC_URL,
    nativeCurrency: {
      decimals: 18,
      name: "CELO",
      symbol: "CELO",
    }
  }
};
2. check if the chainId is valid and the user given and the NETWORK_CONFIGS should be same the user current chainId: "${chainId}"
3. Chekck if the user has given you token name, Amount and chainId
4. For transfers: Extract the recipient address from the intent. Look for phrases like "to 0x...", "send to 0x...", etc.
5. Identify the function of the intent by looking for specific keywords:
   - For balance checks: Use function "balanceof" if the intent contains words like "balance", "how much", "check my", "how many", "see my", "view my"
   - For transfers: Use function "transfer" if the intent contains words like "transfer", "send", "move", "pay"
   - For approvals: Use function "approve" if the intent contains words like "approve", "allow", "permit", "authorize"
   - For allowance checks: Use function "allowance" if the intent contains words like "allowance", "approved amount", "spending limit"
   - For total supply: Use function "totalsupply" if the intent contains words like "total supply", "circulating", "max supply"
   - For converting values: Use function "converttobaseunit" if the intent contains words like "convert to wei", "to base units"
   - For converting from base units: Use function "convertfrombaseunit" if the intent contains words like "convert from wei", "from base units", "to human readable"
   
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

      let result;

      if (functionName === "balanceof") {
        try {
          const address = step.userAddress || userAddress || "";

          if (!address) {
            // If address is not provided, explicitly inform the user we need an address
            result = {
              steps: [
                {
                  description: `Please provide a wallet address to check the ${token} balance.`,
                  chain,
                  requiresWalletConnect: true,
                },
              ],
              requiresWalletConnect: true,
            };
            return result;
          }

          const formattedBalance = await getTokenBalance(address, token);

          // Handle the case where balance check is done in read-only mode
          if (formattedBalance.includes("unavailable")) {
            result = {
              steps: [
                {
                  description: `To check your ${token} balance, please connect your wallet.`,
                  chain,
                  requiresWalletConnect: true,
                },
              ],
              requiresWalletConnect: true,
            };
          } else {
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
                chainId: chainId,
              },
            };
          }
        } catch (error) {
          console.error("Error during balance check:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error occurred when checking balance";

          result = {
            steps: [
              {
                description: `Failed to check balance of ${token} on ${chain}. ${
                  error instanceof Error && error.message.includes("wallet")
                    ? "Please connect your wallet."
                    : `Error: ${errorMessage}`
                }`,
                status: "failed",
                chain,
                requiresWalletConnect:
                  error instanceof Error && error.message.includes("wallet"),
              },
            ],
            error: errorMessage,
            requiresWalletConnect:
              error instanceof Error && error.message.includes("wallet"),
          };
        }
      } else if (functionName === "transfer") {
        try {
          // Check if the required parameters are provided
          if (!amount || !token) {
            throw new Error("Amount and token are required for transfer");
          }

          const to = step.to || ""; // Get the recipient address from the step

          if (!to) {
            // If no recipient address was parsed, we need to ask the user
            return {
              steps: [
                {
                  description: `Please provide a recipient address to transfer ${amount} ${token}.`,
                  chain,
                  status: "pending",
                  details: {
                    missingParam: "recipientAddress",
                    amount,
                    token,
                  },
                },
              ],
              requiresUserInput: true,
            };
          }

          // Check if wallet is connected early - before attempting the transfer
          // This provides a better UX by skipping the attempt when we know it will fail
          // We should rely on the userAddress being passed in rather than checking for ethereum
          // since this code runs server-side during API calls
          if (!userAddress) {
            return {
              steps: [
                {
                  description: `To transfer ${amount} ${token} to ${to}, you need to connect your wallet.`,
                  chain,
                  status: "pending",
                  requiresWalletConnect: true,
                },
              ],
              requiresWalletConnect: true,
            };
          }

          try {
            const transferResult = await transferTokens(to, amount, token);

            // Check if transferResult is indicating a wallet requirement
            if (
              "requiresWallet" in transferResult &&
              transferResult.requiresWallet
            ) {
              return {
                steps: [
                  {
                    description: `To transfer ${amount} ${token} to ${to}, you need to connect your wallet.`,
                    chain,
                    status: "pending",
                    requiresWalletConnect: true,
                    details: {
                      action: transferResult.action,
                      params: transferResult.params,
                    },
                  },
                ],
                requiresWalletConnect: true,
              };
            }

            // At this point, transferResult must be a TransactionReceipt
            const receipt =
              transferResult as ethers.providers.TransactionReceipt;

            result = {
              steps: [
                {
                  description: `Transferred ${amount} ${token} to ${to} on ${chain}.`,
                  transactionHash: receipt.transactionHash,
                  chain,
                },
              ],
            };
          } catch (transferError) {
            const errorMessage =
              transferError instanceof Error
                ? transferError.message
                : "Unknown error during transfer";

            // Check if wallet connection is required
            if (errorMessage.includes("Wallet connection required")) {
              return {
                steps: [
                  {
                    description: `To transfer ${amount} ${token} to ${to}, please connect your wallet.`,
                    chain,
                    status: "pending",
                    requiresWalletConnect: true,
                  },
                ],
                requiresWalletConnect: true,
              };
            } else {
              // For other errors
              throw transferError;
            }
          }
        } catch (error) {
          console.error("Error during transfer:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error occurred during transfer";

          result = {
            steps: [
              {
                description: `Failed to transfer ${amount} ${token} on ${chain}. Error: ${errorMessage}`,
                status: "failed",
                chain,
              },
            ],
            error: errorMessage,
          };
        }
      } else if (functionName === "approve") {
        try {
          // Check if the required parameters are provided
          if (!amount || !token) {
            throw new Error("Amount and token are required for approval");
          }

          const spender = step.spender || ""; // Get the spender address from the step

          if (!spender) {
            throw new Error("Spender address is required for approval");
          }

          const approveResult = await approveTokens(spender, amount, token);

          result = {
            steps: [
              {
                description: `Approved ${amount} ${token} for ${spender} on ${chain}.`,
                transactionHash: approveResult.transactionHash,
                chain,
              },
            ],
          };
        } catch (error) {
          console.error("Error during approval:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error occurred during approval";

          result = {
            steps: [
              {
                description: `Failed to approve ${amount} ${token} on ${chain}. Error: ${errorMessage}`,
                status: "failed",
                chain,
              },
            ],
            error: errorMessage,
          };
        }
      } else if (functionName === "allowance") {
        try {
          // Check if the required parameters are provided
          if (!token) {
            throw new Error("Token is required for allowance check");
          }

          const owner = step.owner || userAddress || "";
          const spender = step.spender || "";

          if (!owner || !spender) {
            throw new Error(
              "Owner and spender addresses are required for allowance check"
            );
          }

          const allowance = await getAllowance(owner, spender, token);

          result = {
            steps: [
              {
                description: `Allowance for ${spender} to spend ${token} from ${owner} is ${allowance}.`,
                chain,
              },
            ],
            details: {
              token,
              allowance,
              owner,
              spender,
            },
          };
        } catch (error) {
          console.error("Error during allowance check:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error occurred during allowance check";

          result = {
            steps: [
              {
                description: `Failed to check allowance for ${token} on ${chain}. Error: ${errorMessage}`,
                status: "failed",
                chain,
              },
            ],
            error: errorMessage,
          };
        }
      } else if (functionName === "totalsupply") {
        try {
          // Check if the required parameters are provided
          if (!token) {
            throw new Error("Token is required for total supply check");
          }

          const totalSupply = await getTotalSupply(token);

          result = {
            steps: [
              {
                description: `Total supply of ${token} is ${totalSupply}.`,
                chain,
              },
            ],
            details: {
              token,
              totalSupply,
            },
          };
        } catch (error) {
          console.error("Error during total supply check:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error occurred during total supply check";

          result = {
            steps: [
              {
                description: `Failed to check total supply of ${token} on ${chain}. Error: ${errorMessage}`,
                status: "failed",
                chain,
              },
            ],
            error: errorMessage,
          };
        }
      } else if (functionName === "converttobaseunit") {
        try {
          // Check if the required parameters are provided
          if (!amount || !token) {
            throw new Error("Amount and token are required for conversion");
          }

          const baseUnitAmount = await convertToBaseUnit(amount, token);

          result = {
            steps: [
              {
                description: `Converted ${amount} ${token} to ${baseUnitAmount} base units.`,
                chain,
              },
            ],
            details: {
              token,
              amount,
              baseUnitAmount,
            },
          };
        } catch (error) {
          console.error("Error during conversion to base units:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error occurred during conversion";

          result = {
            steps: [
              {
                description: `Failed to convert ${amount} ${token} to base units. Error: ${errorMessage}`,
                status: "failed",
                chain,
              },
            ],
            error: errorMessage,
          };
        }
      } else if (functionName === "convertfrombaseunit") {
        try {
          // Check if the required parameters are provided
          if (!amount || !token) {
            throw new Error("Amount and token are required for conversion");
          }

          const humanReadableAmount = await convertFromBaseUnit(amount, token);

          result = {
            steps: [
              {
                description: `Converted ${amount} base units to ${humanReadableAmount} ${token}.`,
                chain,
              },
            ],
            details: {
              token,
              amount,
              humanReadableAmount,
            },
          };
        } catch (error) {
          console.error("Error during conversion from base units:", error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Unknown error occurred during conversion";

          result = {
            steps: [
              {
                description: `Failed to convert ${amount} base units to ${token}. Error: ${errorMessage}`,
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

      if (!parsedJson.steps || !Array.isArray(parsedJson.steps)) {
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
    lowerIntent.includes("balance") ||
    lowerIntent.includes("check") ||
    lowerIntent.includes("how much")
  ) {
    return {
      steps: [
        {
          description: "Check token balance",
          chain: "Multiple",
        },
      ],
    };
  } else if (
    lowerIntent.includes("transfer") ||
    lowerIntent.includes("send") ||
    lowerIntent.includes("pay")
  ) {
    return {
      steps: [
        {
          description: "Transfer tokens to recipient",
          chain: "Ethereum",
        },
      ],
    };
  } else if (
    lowerIntent.includes("approve") ||
    lowerIntent.includes("allow") ||
    lowerIntent.includes("permission")
  ) {
    return {
      steps: [
        {
          description: "Approve tokens for spender",
          chain: "Ethereum",
        },
      ],
    };
  } else {
    return {
      steps: [
        { description: "Analyze intent requirements", chain: "N/A" },
        { description: "Execute primary transaction", chain: "Multiple" },
      ],
    };
  }
}
