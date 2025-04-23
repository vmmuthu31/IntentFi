/**
 * Integration Service
 *
 * This service provides integration with blockchain networks using ethers.js
 * It handles transaction signing and other blockchain operations
 */

import { BigNumber, ethers } from "ethers";
import mintABI from "../../artifacts/MockToken.json";
import lendingPoolABI from "../../artifacts/LendingPool.json";
import yieldFarmingABI from "../../artifacts/YieldFarm.json";
import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  Account,
  Chain,
  WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores, rootstockTestnet } from "viem/chains";

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

// Export blockchain interaction functions
export {
  deposit,
  withdraw,
  borrow,
  repay,
  listToken,
  createPool,
  stake,
  getPoolInformation as localGetPoolInformation,
};

// Fix the TransactionRequest definition to match viem's type requirements
export type TransactionRequest = {
  to?: `0x${string}`;
  from?: `0x${string}`;
  nonce?: bigint; // Changed from number to bigint for correct typing
  gas?: bigint;
  gasPrice?: bigint;
  value?: bigint;
  data?: `0x${string}`;
  type?: "legacy" | "eip2930" | "eip1559";
  chain?: Chain;
};

/**
 * Helper function to prepare transaction for wallet client
 */
const prepareTransaction = (params: {
  account: Account | { address: `0x${string}` };
  to: `0x${string}`;
  data: `0x${string}`;
  gas: bigint;
  gasPrice: bigint;
  nonce: bigint | number;
  chain: Chain;
}) => {
  // Convert simple address objects to string addresses
  const account =
    "address" in params.account && !("signMessage" in params.account)
      ? params.account.address
      : params.account;

  return {
    account,
    to: params.to,
    data: params.data,
    gas: params.gas,
    gasPrice: params.gasPrice,
    nonce:
      typeof params.nonce === "bigint" ? Number(params.nonce) : params.nonce, // Convert bigint to number for viem compatibility
    chain: params.chain,
  };
};

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
    rpcUrl:
      process.env.CELO_RPC_URL || "https://alfajores-forno.celo-testnet.org",
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
  },
};

/**
 * Format units to human-readable form
 * @param {string|BigNumber} value Value to format
 * @param {number} decimals Number of decimals
 * @returns {string} Formatted value
 */
const formatUnits = (value: string | BigNumber, decimals = 18) => {
  return ethers.utils.formatUnits(value, decimals);
};

/**
 * Parse units from human-readable form to wei
 * @param {string} value Value to parse
 * @param {number} decimals Number of decimals
 * @returns {BigNumber} Parsed value
 */
const parseUnits = (value: string, decimals = 18) => {
  return ethers.utils.parseUnits(value.toString(), decimals);
};

// Define types for the sendTransaction function parameters
type SendTransactionParams = {
  isBrowser: boolean;
  walletClient: WalletClient;
  account: `0x${string}` | Account;
  to: string;
  data: `0x${string}`;
  gas: bigint;
  gasPrice: bigint;
  nonce: number | bigint; // Accept both number and bigint
  chain: Chain;
};

// Helper function to send transactions in both browser and server environments
const sendTransaction = async ({
  isBrowser,
  walletClient,
  account,
  to,
  data,
  gas,
  gasPrice,
  nonce,
  chain,
}: SendTransactionParams): Promise<`0x${string}`> => {
  if (isBrowser) {
    // Browser environment - use window.ethereum
    // Get the address from the account object or string
    const fromAddress = typeof account === "string" ? account : account.address;

    const hash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: fromAddress,
          to,
          data,
          gas: `0x${gas.toString(16)}`,
          gasPrice: `0x${gasPrice.toString(16)}`,
        },
      ],
    });
    console.log("Transaction sent via browser wallet:", hash);
    return hash as `0x${string}`;
  } else {
    // Server environment - use viem wallet client
    const hash = await walletClient.sendTransaction({
      account, // walletClient.sendTransaction accepts Account | address
      to: to as `0x${string}`,
      data,
      gas,
      gasPrice,
      nonce: typeof nonce === "bigint" ? Number(nonce) : nonce, // Convert to number if it's a bigint
      chain,
    });
    console.log("Transaction sent via wallet client:", hash);
    return hash;
  }
};

// Update initalizeClients to detect browser environment
const initalizeClients = async ({ chainId }: { chainId: number }) => {
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Private key not found");
  }

  // Convert chainId to number if it's a string
  const numericChainId =
    typeof chainId === "string" ? parseInt(chainId, 10) : chainId;

  // Find matching network config
  let networkConfig = Object.values(NETWORK_CONFIGS).find(
    (config) => config.chainId === numericChainId
  );

  // If network config not found, use default based on the closest match or fallback
  if (!networkConfig) {
    console.warn(
      `Network config not found for chainId ${numericChainId}. Using fallback.`
    );

    // Try to map common chain IDs that might be confused
    if (numericChainId === 42220) {
      // Celo Mainnet
      console.log(
        "Detected Celo Mainnet ID, falling back to Celo Alfajores testnet"
      );
      networkConfig = NETWORK_CONFIGS.celoAlfajores;
    } else if (numericChainId === 30) {
      // Rootstock Mainnet
      console.log(
        "Detected Rootstock Mainnet ID, falling back to Rootstock testnet"
      );
      networkConfig = NETWORK_CONFIGS.rootstock;
    } else {
      // Default fallback to Celo Alfajores
      console.log("Using default fallback to Celo Alfajores testnet");
      networkConfig = NETWORK_CONFIGS.celoAlfajores;
    }
  }

  const chain = networkConfig.chain;
  const rpcUrl = networkConfig.rpcUrl;
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  // Check if we're in a browser environment before using window.ethereum
  const isClient = typeof window !== "undefined";
  const walletClient = createWalletClient({
    chain,
    transport: isClient && window.ethereum ? window.ethereum : http(rpcUrl),
  });

  return {
    publicClient,
    walletClient,
    isBrowser: isClient && !!window.ethereum,
    chain,
  };
};

/**
 * Approve token spending using wagmi
 * @param {Object} req Request object with contract details
 * @returns {Promise<Object>} Transaction result
 */
const approveWithWagmi = async ({ chainId }: { chainId: number }) => {
  try {
    const { publicClient, walletClient } = await initalizeClients({ chainId });
    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    if (!networkConfig) {
      throw new Error("Network config not found");
    }
    const spenderAddress = networkConfig.contractAddresses.LendingPool;

    if (!process.env.PRIVATE_KEY) {
      throw new Error("Private key not found");
    }
    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
    const tokens = networkConfig.contractAddresses.Token;
    const [gasPrice, nonce] = await Promise.all([
      publicClient.getGasPrice(),
      publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      }),
    ]);

    const gasLimit = BigInt(100000);
    const balance = await publicClient.getBalance({ address: account.address });

    const totalTokens = Object.keys(tokens).length;
    const estimatedTotalGasCost = gasLimit * gasPrice * BigInt(totalTokens);

    if (balance < estimatedTotalGasCost) {
      return {
        success: false,
        error: "Insufficient funds",
        details: {
          balance: balance.toString(),
          required: estimatedTotalGasCost.toString(),
          missingAmount: (estimatedTotalGasCost - balance).toString(),
          message: "Please fund your account with testnet CELO",
          address: account.address,
          faucetUrl: "https://faucet.celo.org/alfajores",
        },
      };
    }

    const results = [];

    // Loop through all tokens and approve each one
    for (const [tokenSymbol, tokenAddress] of Object.entries(tokens)) {
      try {
        // Encode approval data
        const data = encodeFunctionData({
          abi: mintABI,
          functionName: "approve",
          args: [
            spenderAddress,
            BigInt(
              ethers.utils.parseUnits("1000000000000000000000000").toString()
            ),
          ],
        });

        const txParams = prepareTransaction({
          account,
          to: tokenAddress as `0x${string}`,
          data,
          gas: gasLimit,
          gasPrice,
          nonce: BigInt(nonce) + BigInt(results.length),
          chain: networkConfig.chain,
        });

        const hash = await walletClient.sendTransaction(txParams);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        results.push({
          token: tokenSymbol,
          success: true,
          transactionHash: hash,
          receipt: {
            blockHash: receipt.blockHash,
            blockNumber: Number(receipt.blockNumber),
            gasUsed: Number(receipt.gasUsed),
            status: receipt.status,
          },
        });
      } catch (tokenError: unknown) {
        results.push({
          token: tokenSymbol,
          success: false,
          error:
            tokenError instanceof Error
              ? tokenError.message
              : String(tokenError),
        });
      }
    }

    // Check if any approvals were successful
    const hasSuccessfulApprovals = results.some((result) => result.success);

    if (!hasSuccessfulApprovals) {
      throw new Error("All token approvals failed");
    }

    return {
      success: true,
      results,
    };
  } catch (error: unknown) {
    console.error("Transaction Error:", {
      message: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.cause : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (
      error instanceof Error &&
      error.message.includes("insufficient funds")
    ) {
      return {
        success: false,
        error: "Insufficient funds for transaction",
        details: {
          message:
            "Please fund your account with testnet CELO using the faucet",
          faucetUrl: "https://faucet.celo.org/alfajores",
        },
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.cause : undefined,
    };
  }
};

const getTokenBalance = async ({
  chainId,
  token,
}: {
  chainId: number;
  token: string;
}) => {
  try {
  const { publicClient } = await initalizeClients({ chainId });
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Private key not found");
  }
  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
  const networkConfig = Object.values(NETWORK_CONFIGS).find(
    (config) => config.chainId === chainId
  );
  if (!networkConfig) {
    throw new Error("Network config not found");
  }
  const tokenAddress =
    networkConfig.contractAddresses.Token[
      token as keyof typeof networkConfig.contractAddresses.Token
    ];

    if (!tokenAddress) {
      console.warn(
        `Token ${token} not found in network config for chain ${chainId}`
      );
      return "0";
    }

    // Verify if the contract exists at the address
    console.log(
      `Checking balance for token: ${token} at address: ${tokenAddress}`
    );
    const contractCode = await publicClient
      .getBytecode({
        address: tokenAddress as `0x${string}`,
      })
      .catch((error) => {
        console.warn(`Error checking contract code for ${token}:`, error);
        return null;
      });

    if (!contractCode || contractCode === "0x") {
      console.warn(
        `No contract found at address ${tokenAddress} for token ${token}`
      );
      return "0";
    }

    const balance = await publicClient
      .readContract({
    address: tokenAddress as `0x${string}`,
    abi: mintABI,
    functionName: "balanceOf",
    args: [account.address],
      })
      .catch((error) => {
        console.warn(`Error checking balance for ${token}:`, error);
        return BigInt(0);
  });

  return BigInt(balance as bigint).toString();
  } catch (error) {
    console.error(`Error getting balance for ${token}:`, error);
    return "0"; // Return 0 balance on error instead of failing
  }
};

const checkAllowance = async ({ chainId }: { chainId: number }) => {
  try {
  const { publicClient } = await initalizeClients({ chainId });
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Private key not found");
  }
  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
  const networkConfig = Object.values(NETWORK_CONFIGS).find(
    (config) => config.chainId === chainId
  );
  if (!networkConfig) {
    throw new Error("Network config not found");
  }
  const tokens = networkConfig.contractAddresses.Token;
  const allowances: { token: string; allowance: string }[] = [];

  for (const [tokenSymbol, tokenAddress] of Object.entries(tokens)) {
      try {
        console.log(
          `Checking allowance for token: ${tokenSymbol} at address: ${tokenAddress}`
        );

        // Verify if the contract exists at the address
        const contractCode = await publicClient.getBytecode({
          address: tokenAddress as `0x${string}`,
        });

        if (!contractCode || contractCode === "0x") {
          console.warn(
            `No contract found at address ${tokenAddress} for token ${tokenSymbol}`
          );
          allowances.push({
            token: tokenSymbol,
            allowance: "0",
          });
          continue;
        }

        const tokenAllowance = await publicClient
          .readContract({
      address: tokenAddress as `0x${string}`,
      abi: mintABI,
      functionName: "allowance",
      args: [
        account.address,
        networkConfig.contractAddresses.LendingPool as `0x${string}`,
      ],
          })
          .catch((error) => {
            console.warn(`Error checking allowance for ${tokenSymbol}:`, error);
            return BigInt(0); // Return 0 on error
    });

    allowances.push({
      token: tokenSymbol,
      allowance: BigInt(tokenAllowance as bigint).toString(),
    });
      } catch (error) {
        console.warn(`Failed to check allowance for ${tokenSymbol}:`, error);
        allowances.push({
          token: tokenSymbol,
          allowance: "0",
        });
      }
  }
  return allowances;
  } catch (error) {
    console.error("Error in checkAllowance:", error);
    // Return empty allowances array instead of throwing error
    return [];
  }
};

const fundFaucet = async ({ chainId }: { chainId: number }) => {
  try {
    const { publicClient, walletClient, chain } = await initalizeClients({
      chainId,
    });
    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    if (!networkConfig) {
      throw new Error("Network config not found");
    }
    if (!process.env.PRIVATE_KEY) {
      throw new Error("Private key not found");
    }
    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
    const tokens = networkConfig.contractAddresses.Token;

    const [gasPrice, nonce] = await Promise.all([
      publicClient.getGasPrice(),
      publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      }),
    ]);

    const gasLimit = BigInt(100000);
    const balance = await publicClient.getBalance({ address: account.address });
    const totalTokens = Object.keys(tokens).length;

    const estimatedTotalGasCost = gasLimit * gasPrice * BigInt(totalTokens);

    if (balance < estimatedTotalGasCost) {
      return {
        success: false,
        error: "Insufficient funds",
        details: {
          balance: balance.toString(),
          required: estimatedTotalGasCost.toString(),
          missingAmount: (estimatedTotalGasCost - balance).toString(),
        },
      };
    }

    const results = [];
    for (const [tokenSymbol, tokenAddress] of Object.entries(tokens)) {
      try {
        const amount = BigInt(1000000000000000000000000);
        const data = encodeFunctionData({
          abi: mintABI,
          functionName: "faucet",
          args: [amount],
        });
        const txParams = prepareTransaction({
          account,
          to: tokenAddress as `0x${string}`,
          data,
          gas: gasLimit,
          gasPrice,
          nonce: BigInt(nonce) + BigInt(results.length),
          chain: chain,
        });
        const hash = await walletClient.sendTransaction(txParams);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // Format BigInt values to strings
        const formattedReceipt = {
          blockHash: receipt.blockHash,
          blockNumber: receipt.blockNumber.toString(),
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status,
          transactionHash: receipt.transactionHash,
        };

        results.push({
          token: tokenSymbol,
          success: receipt.status === "success",
          transactionHash: hash,
          receipt: formattedReceipt,
        });
      } catch (error: unknown) {
        console.error(
          `Error funding ${tokenSymbol}:`,
          error instanceof Error ? error.message : String(error)
        );
        results.push({
          token: tokenSymbol,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return {
      success: results.some((r) => r.success),
      results,
    };
  } catch (error) {
    console.error("Error in fundFaucet:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const deposit = async ({
  chainId,
  token,
  amount,
}: {
  chainId: number;
  token: string;
  amount: string;
}) => {
  try {
    const { publicClient, walletClient, isBrowser, chain } =
      await initalizeClients({ chainId });

    // Create the appropriate account
    let account;
    if (isBrowser) {
      // Browser environment - get user's wallet address
      const [address] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      account = { address: address as `0x${string}` };
      console.log("Using browser wallet account:", address);
    } else {
      // Server environment - use private key
    if (!process.env.PRIVATE_KEY) {
      throw new Error("Private key not found");
    }
      account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
      console.log("Using private key account");
    }

    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    if (!networkConfig) {
      throw new Error("Network config not found");
    }

    const contractAddress = networkConfig.contractAddresses.LendingPool;
    const tokenAddress =
      networkConfig.contractAddresses.Token[
        token as keyof typeof networkConfig.contractAddresses.Token
      ];

    if (!tokenAddress) {
      return {
        success: false,
        error: `Token ${token} not found in network config for chain ${chainId}`,
      };
    }

    // Verify if the token contract exists
    console.log(
      `Verifying token contract: ${token} at address: ${tokenAddress}`
    );
    const tokenContractCode = await publicClient
      .getBytecode({
        address: tokenAddress as `0x${string}`,
      })
      .catch((error) => {
        console.warn(`Error checking token contract code:`, error);
        return null;
      });

    if (!tokenContractCode || tokenContractCode === "0x") {
      return {
        success: false,
        error: `Token contract not found at ${tokenAddress}`,
        details: {
          message: `The token contract for ${token} does not exist at the configured address.`,
          tokenAddress,
          solution:
            "Please update the contract address configuration or deploy the token contract.",
        },
      };
    }

    // Also verify if lending pool contract exists
    console.log(
      `Verifying lending pool contract at address: ${contractAddress}`
    );
    const poolContractCode = await publicClient
      .getBytecode({
        address: contractAddress as `0x${string}`,
      })
      .catch((error) => {
        console.warn(`Error checking lending pool contract code:`, error);
        return null;
      });

    if (!poolContractCode || poolContractCode === "0x") {
      return {
        success: false,
        error: `Lending pool contract not found at ${contractAddress}`,
        details: {
          message:
            "The lending pool contract does not exist at the configured address.",
          contractAddress,
          solution:
            "Please update the contract address configuration or deploy the lending pool contract.",
        },
      };
    }

    // Check token-specific allowance
    const allowances = await checkAllowance({ chainId });
    const tokenAllowance = allowances.find((a) => a.token === token);

    // Convert amount to Wei (parseUnits) before comparing with BigInt
    const amountInWei = parseUnits(amount, 18).toString();

    if (
      !tokenAllowance ||
      BigInt(tokenAllowance.allowance) < BigInt(amountInWei)
    ) {
      console.log(
        `Insufficient allowance for ${token}, attempting approval...`
      );
      const approvalResults = await approveWithWagmi({ chainId });
      console.log("Approval results:", JSON.stringify(approvalResults));

      if (!approvalResults.success) {
        return {
          success: false,
          error: `Failed to approve ${token} tokens for deposit`,
          details: approvalResults,
        };
      }

      const updatedAllowances = await checkAllowance({ chainId });
      const updatedTokenAllowance = updatedAllowances.find(
        (a) => a.token === token
      );

      if (
        !updatedTokenAllowance ||
        BigInt(updatedTokenAllowance.allowance) < BigInt(amountInWei)
      ) {
        return {
          success: false,
          error: `Failed to approve enough ${token} tokens for deposit`,
          details: {
            required: amount,
            approved: updatedTokenAllowance
              ? updatedTokenAllowance.allowance
              : "0",
          },
        };
      }
    }

    // Check token balance
    const tokenBalance = await getTokenBalance({ chainId, token });

    // Convert amount to Wei for balance comparison
    if (BigInt(tokenBalance) < BigInt(amountInWei)) {
      console.log(
        `Insufficient ${token} balance, trying to get from faucet...`
      );
      const faucetResults = await fundFaucet({ chainId });
      console.log("Faucet results:", JSON.stringify(faucetResults));

      // Verify balance was updated
      const updatedBalance = await getTokenBalance({ chainId, token });

      if (BigInt(updatedBalance) < BigInt(amountInWei)) {
        return {
          success: false,
          error: `Failed to get enough ${token} tokens from faucet`,
          details: {
            required: amount,
            balance: formatUnits(updatedBalance, 18),
            faucetResults,
          },
        };
      }
    }

    const [gasPrice, nonce] = await Promise.all([
      publicClient.getGasPrice(),
      publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      }),
    ]);

    const gasLimit = BigInt(200000);
    const balance = await publicClient.getBalance({ address: account.address });

    const estimatedTotalGasCost = gasLimit * gasPrice;

    if (balance < estimatedTotalGasCost) {
      return {
        success: false,
        error: "Insufficient funds",
        details: {
          balance: balance.toString(),
          required: estimatedTotalGasCost.toString(),
          missingAmount: (estimatedTotalGasCost - balance).toString(),
          message: "Please fund your account with testnet CELO",
          address: account.address,
          faucetUrl: "https://faucet.celo.org/alfajores",
        },
      };
    }

    const tokenAmount = parseUnits(amount, 18);

    const data = encodeFunctionData({
      abi: lendingPoolABI,
      functionName: "deposit",
      args: [tokenAddress, tokenAmount],
    });

    // First simulate the transaction to check for failures
    console.log("Simulating deposit transaction...");

    try {
      await publicClient.simulateContract({
        address: contractAddress as `0x${string}`,
        abi: lendingPoolABI,
        functionName: "deposit",
        args: [tokenAddress, tokenAmount],
        account: account.address,
      });
      console.log("Deposit simulation successful, proceeding with transaction");
    } catch (simError) {
      console.error("Deposit simulation failed:", simError);
      return {
        success: false,
        error: "Transaction would fail",
        details: {
          message: `The deposit transaction would fail: ${simError instanceof Error ? simError.message : String(simError)}`,
          suggestion:
            "Contract may not be deployed correctly or token is incompatible",
        },
      };
    }

    console.log("Sending deposit transaction...");

    // Use the sendTransaction helper function
    const txAddress = typeof account === "string" ? account : account.address;

    const hash = await sendTransaction({
      isBrowser,
      walletClient,
      account: txAddress,
      to: contractAddress as `0x${string}`,
      data,
      gas: gasLimit,
      gasPrice,
      nonce: Number(nonce),
      chain,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "reverted") {
      console.error("Transaction reverted!");

      // Try to decode the revert reason if possible
      try {
        const revertReason = await publicClient.call({
          account: account.address,
          to: contractAddress as `0x${string}`,
          data,
          gas: gasLimit,
          gasPrice,
          nonce: Number(nonce),
        });
        console.log("Revert reason:", revertReason);
      } catch (error: unknown) {
        console.error(
          "Error getting revert reason:",
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    const formattedReceipt = {
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber.toString(),
      contractAddress: receipt.contractAddress,
      cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice.toString(),
      from: receipt.from,
      gasUsed: receipt.gasUsed.toString(),
      logs: receipt.logs.map((log) => ({
        ...log,
        blockNumber: log.blockNumber.toString(),
        logIndex: log.logIndex.toString(),
        transactionIndex: log.transactionIndex.toString(),
      })),
      logsBloom: receipt.logsBloom,
      status: receipt.status,
      to: receipt.to,
      transactionHash: receipt.transactionHash,
      transactionIndex: receipt.transactionIndex.toString(),
      type: receipt.type,
    };

    return {
      success: receipt.status === "success",
      transactionHash: hash,
      receipt: formattedReceipt,
    };
  } catch (error) {
    console.error("Deposit error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.cause : undefined,
    };
  }
};

const withdraw = async ({
  chainId,
  token,
  amount,
}: {
  chainId: number;
  token: string;
  amount: string;
}) => {
  try {
    const { publicClient, walletClient, isBrowser, chain } =
      await initalizeClients({ chainId });

    // Create the appropriate account
    let account;
    if (isBrowser) {
      // Browser environment - get user's wallet address
      const [address] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      account = { address: address as `0x${string}` };
      console.log("Using browser wallet account:", address);
    } else {
      // Server environment - use private key
    if (!process.env.PRIVATE_KEY) {
      throw new Error("Private key not found");
    }
      account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
      console.log("Using private key account");
    }

    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    if (!networkConfig) {
      throw new Error("Network config not found");
    }

    const contractAddress = networkConfig.contractAddresses.LendingPool;
    const tokenAddress =
      networkConfig.contractAddresses.Token[
        token as keyof typeof networkConfig.contractAddresses.Token
      ];

    if (!tokenAddress) {
      return {
        success: false,
        error: `Token ${token} not found in network config for chain ${chainId}`,
      };
    }

    // Verify if the token contract exists
    console.log(
      `Verifying token contract: ${token} at address: ${tokenAddress}`
    );
    const tokenContractCode = await publicClient
      .getBytecode({
        address: tokenAddress as `0x${string}`,
      })
      .catch((error) => {
        console.warn(`Error checking token contract code:`, error);
        return null;
      });

    if (!tokenContractCode || tokenContractCode === "0x") {
      return {
        success: false,
        error: `Token contract not found at ${tokenAddress}`,
        details: {
          message: `The token contract for ${token} does not exist at the configured address.`,
          tokenAddress,
          solution:
            "Please update the contract address configuration or deploy the token contract.",
        },
      };
    }

    // Also verify if lending pool contract exists
    console.log(
      `Verifying lending pool contract at address: ${contractAddress}`
    );
    const poolContractCode = await publicClient
      .getBytecode({
        address: contractAddress as `0x${string}`,
      })
      .catch((error) => {
        console.warn(`Error checking lending pool contract code:`, error);
        return null;
      });

    if (!poolContractCode || poolContractCode === "0x") {
      return {
        success: false,
        error: `Lending pool contract not found at ${contractAddress}`,
        details: {
          message:
            "The lending pool contract does not exist at the configured address.",
          contractAddress,
          solution:
            "Please update the contract address configuration or deploy the lending pool contract.",
        },
      };
    }

    // Check token balance
    console.log(`Checking ${token} balance...`);
    const tokenBalance = await getTokenBalance({ chainId, token });
    console.log(`${token} balance:`, tokenBalance);

    // Convert amount to Wei for balance comparison
    const amountInWei = parseUnits(amount, 18).toString();

    if (BigInt(tokenBalance) < BigInt(amountInWei)) {
      console.log(
        `Insufficient ${token} balance, trying to get from faucet...`
      );
      const faucetResults = await fundFaucet({ chainId });
      console.log("Faucet results:", JSON.stringify(faucetResults));

      // Verify balance was updated
      const updatedBalance = await getTokenBalance({ chainId, token });

      if (BigInt(updatedBalance) < BigInt(amountInWei)) {
        return {
          success: false,
          error: `Failed to get enough ${token} tokens from faucet`,
          details: {
            required: amount,
            balance: formatUnits(updatedBalance, 18),
            faucetResults,
          },
        };
      }
    }

    const [gasPrice, nonce] = await Promise.all([
      publicClient.getGasPrice(),
      publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      }),
    ]);

    const gasLimit = BigInt(200000);
    const balance = await publicClient.getBalance({ address: account.address });

    const estimatedTotalGasCost = gasLimit * gasPrice;

    if (balance < estimatedTotalGasCost) {
      return {
        success: false,
        error: "Insufficient funds",
        details: {
          balance: balance.toString(),
          required: estimatedTotalGasCost.toString(),
          missingAmount: (estimatedTotalGasCost - balance).toString(),
        },
      };
    }

    const tokenAmount = parseUnits(amount, 18);

    const withdrawData = encodeFunctionData({
      abi: lendingPoolABI,
      functionName: "withdraw",
      args: [tokenAddress, tokenAmount],
    });

    // First simulate the transaction to check for failures
    console.log("Simulating withdraw transaction...");

    try {
      await publicClient.simulateContract({
        address: contractAddress as `0x${string}`,
        abi: lendingPoolABI,
        functionName: "withdraw",
        args: [tokenAddress, tokenAmount],
        account: account.address,
      });
      console.log(
        "Withdraw simulation successful, proceeding with transaction"
      );
    } catch (simError) {
      console.error("Withdraw simulation failed:", simError);
      return {
        success: false,
        error: "Transaction would fail",
        details: {
          message: `The withdraw transaction would fail: ${simError instanceof Error ? simError.message : String(simError)}`,
          suggestion:
            "Contract may not be deployed correctly or you have no tokens deposited",
        },
      };
    }

    console.log("Sending withdraw transaction...");

    // Use the sendTransaction helper function
    const txAddress = typeof account === "string" ? account : account.address;

    const hash = await sendTransaction({
      isBrowser,
      walletClient,
      account: txAddress,
      to: contractAddress as `0x${string}`,
      data: withdrawData,
      gas: gasLimit,
      gasPrice,
      nonce: Number(nonce),
      chain,
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: hash,
    });

    if (receipt.status === "reverted") {
      console.error("Transaction reverted!");

      // Try to decode the revert reason if possible
      try {
        const revertReason = await publicClient.call({
          account: account.address,
          to: contractAddress as `0x${string}`,
          data: withdrawData,
          gas: gasLimit,
          gasPrice,
          nonce: Number(nonce),
        });
        console.log("Revert reason:", revertReason);
      } catch (error: unknown) {
        console.error(
          "Error getting revert reason:",
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    const formattedReceipt = {
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber.toString(),
      contractAddress: receipt.contractAddress,
      cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice.toString(),
      from: receipt.from,
      gasUsed: receipt.gasUsed.toString(),
      logs: receipt.logs.map((log) => ({
        ...log,
        blockNumber: log.blockNumber.toString(),
        logIndex: log.logIndex.toString(),
        transactionIndex: log.transactionIndex.toString(),
      })),
      logsBloom: receipt.logsBloom,
      status: receipt.status,
      to: receipt.to,
      transactionHash: receipt.transactionHash,
      transactionIndex: receipt.transactionIndex.toString(),
      type: receipt.type,
    };

    return {
      success: receipt.status === "success",
      transactionHash: hash,
      receipt: formattedReceipt,
    };
  } catch (error) {
    console.error("Withdraw error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.cause : undefined,
    };
  }
};

const borrow = async ({
  chainId,
  token,
  amount,
}: {
  chainId: number;
  token: string;
  amount: string;
}) => {
  try {
    const { publicClient, walletClient } = await initalizeClients({ chainId });
    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    if (!networkConfig) {
      throw new Error("Network config not found");
    }
    const chain = networkConfig.chain;
    if (!process.env.PRIVATE_KEY) {
      throw new Error("Private key not found");
    }
    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
    const userAddress = account.address;
    const contractAddress = networkConfig.contractAddresses.LendingPool;
    const tokenAddress =
      networkConfig.contractAddresses.Token[
        token as keyof typeof networkConfig.contractAddresses.Token
      ];

    if (!tokenAddress) {
      throw new Error(`Token ${token} is not supported on this chain`);
    }

    // Convert amount to Wei once for all comparisons
    const amountInWei = parseUnits(amount, 18);
    const amountInWeiString = amountInWei.toString();

    // Check if the lending pool has sufficient liquidity
    try {
      const getAvailableLiquidity = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: lendingPoolABI,
        functionName: "getAvailableLiquidity",
        args: [tokenAddress],
      });

      const liquidityBigInt = getAvailableLiquidity as bigint;

      if (liquidityBigInt < BigInt(amountInWeiString)) {
        return {
          success: false,
          error: "Insufficient liquidity in lending pool",
          details: {
            available: formatUnits(liquidityBigInt.toString(), 18),
            requested: amount,
          },
        };
      }
    } catch (error) {
      console.warn(
        "Could not check liquidity, proceeding with borrow attempt:",
        error
      );
    }

    // If userAddress is provided, check user's collateral
    if (userAddress) {
      try {
        const getUserAccountData = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: lendingPoolABI,
          functionName: "getUserAccountData",
          args: [userAddress as `0x${string}`],
        });

        // Parse user account data (structure depends on your lending pool implementation)
        const userData = getUserAccountData as {
          totalCollateralETH: bigint;
          totalDebtETH: bigint;
          availableBorrowsETH: bigint;
          currentLiquidationThreshold: bigint;
          ltv: bigint;
          healthFactor: bigint;
        };

        // Check if user has enough borrowing power
        const requestedAmountInETH = await getTokenValueInETH(
          publicClient,
          tokenAddress,
          BigInt(amountInWeiString),
          contractAddress
        );

        if (userData.availableBorrowsETH < requestedAmountInETH) {
          return {
            success: false,
            error: "Insufficient collateral for borrowing",
            details: {
              availableBorrowsETH: formatUnits(
                userData.availableBorrowsETH.toString(),
                18
              ),
              requestedAmountInETH: formatUnits(
                requestedAmountInETH.toString(),
                18
              ),
              healthFactor: formatUnits(userData.healthFactor.toString(), 18),
            },
          };
        }
      } catch (error) {
        console.warn(
          "Could not check collateral, proceeding with borrow attempt:",
          error
        );
      }
    }

    // Use the previously parsed amount
    const tokenAmount = amountInWei;

    // Prepare transaction parameters
    const data = encodeFunctionData({
      abi: lendingPoolABI,
      functionName: "borrow",
      args: [tokenAddress, tokenAmount],
    });

    // Increase gas limit to handle complex lending operations
    const gasLimit = BigInt(300000); // Increased from 200000
    const [gasPrice, nonce] = await Promise.all([
      publicClient.getGasPrice(),
      publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      }),
    ]);

    // Add a small buffer to gas price for faster confirmation
    const adjustedGasPrice = (gasPrice * BigInt(115)) / BigInt(100); // 15% buffer

    const txParams = prepareTransaction({
      account,
      to: contractAddress as `0x${string}`,
      data,
      gas: gasLimit,
      gasPrice: adjustedGasPrice,
      nonce: BigInt(nonce),
      chain: chain,
    });

    // Send transaction with improved error handling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hash = await walletClient.sendTransaction(txParams as any);
    console.log(`Borrow transaction sent: ${hash}`);

    // Wait for receipt with timeout
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 60_000, // 60 second timeout
    });

    const formattedReceipt = {
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber.toString(),
      contractAddress: receipt.contractAddress,
      cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice.toString(),
      from: receipt.from,
      gasUsed: receipt.gasUsed.toString(),
      logs: receipt.logs.map((log) => ({
        ...log,
        blockNumber: log.blockNumber.toString(),
        logIndex: log.logIndex.toString(),
        transactionIndex: log.transactionIndex.toString(),
      })),
      logsBloom: receipt.logsBloom,
      status: receipt.status,
      to: receipt.to,
      transactionHash: receipt.transactionHash,
      transactionIndex: receipt.transactionIndex.toString(),
      type: receipt.type,
    };

    // Check status and provide detailed result
    if (receipt.status === "reverted") {
      // Try to decode reversion reason if available
      let revertReason = "Unknown reason";
      try {
        const tx = await publicClient.getTransaction({
          hash,
        });

        if (tx.input) {
          // Attempt to simulate the transaction to get reversion reason
          const simulationResult = await publicClient
            .call({
              to: tx.to as `0x${string}`,
              data: tx.input as `0x${string}`,
              account: tx.from,
            })

            .catch((err) => {
              // Extract revert reason from error
              const reason = extractRevertReason(err);
              if (reason) revertReason = reason;
            });
          console.log("Simulation result:", simulationResult);
        }
      } catch (error) {
        console.error("Error decoding revert reason:", error);
      }

      return {
        success: false,
        transactionHash: hash,
        receipt: formattedReceipt,
        error: `Transaction reverted: ${revertReason}`,
      };
    }

    return {
      success: receipt.status === "success",
      transactionHash: hash,
      receipt: formattedReceipt,
    };
  } catch (error) {
    console.error("Borrow error:", error);

    // Provide more specific error messages based on error type
    let errorMessage = error instanceof Error ? error.message : String(error);
    let errorType = "unknown";

    if (errorMessage.includes("insufficient funds")) {
      errorType = "insufficient_funds";
      errorMessage = "Insufficient funds to execute transaction";
    } else if (errorMessage.includes("user rejected")) {
      errorType = "user_rejected";
      errorMessage = "Transaction rejected by user";
    } else if (errorMessage.includes("token not supported")) {
      errorType = "unsupported_token";
      errorMessage = `The token ${token} is not supported on this chain`;
    }

    return {
      success: false,
      error: errorMessage,
      errorType,
      details: error instanceof Error ? error.cause : undefined,
    };
  }
};

// Helper function to extract revert reason from error
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractRevertReason = (error: any): string => {
  if (!error) return "Unknown error";

  const errorString = String(error);

  // Common patterns for revert reason extraction
  const revertPatterns = [
    /reverted with reason string '([^']+)'/,
    /reverted with custom error '([^']+)'/,
    /reverted with panic code ([0-9x]+)/,
  ];

  for (const pattern of revertPatterns) {
    const match = errorString.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return "Unknown revert reason";
};

// Helper function to get token value in ETH
const getTokenValueInETH = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicClient: any,
  tokenAddress: string,
  tokenAmount: bigint,
  lendingPoolAddress: string
): Promise<bigint> => {
  try {
    // This function would normally call a price oracle or price feed
    // For now, we'll implement a simple placeholder
    const priceOracle = await publicClient.readContract({
      address: lendingPoolAddress as `0x${string}`,
      abi: lendingPoolABI,
      functionName: "getPriceOracle",
    });

    if (!priceOracle) return BigInt(0);

    const tokenPriceInETH = await publicClient.readContract({
      address: priceOracle as `0x${string}`,
      abi: [
        {
          inputs: [{ internalType: "address", name: "asset", type: "address" }],
          name: "getAssetPrice",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "getAssetPrice",
      args: [tokenAddress as `0x${string}`],
    });

    return (tokenAmount * (tokenPriceInETH as bigint)) / BigInt(10 ** 18);
  } catch (error) {
    console.error("Error getting token value in ETH:", error);
    return BigInt(0);
  }
};

const repay = async ({
  chainId,
  token,
  amount,
}: {
  chainId: number;
  token: string;
  amount: string;
}) => {
  try {
    const { publicClient, walletClient } = await initalizeClients({ chainId });
    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    if (!networkConfig) {
      throw new Error("Network config not found");
    }

    if (!process.env.PRIVATE_KEY) {
      throw new Error("Private key not found");
    }
    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
    const contractAddress = networkConfig.contractAddresses.LendingPool;
    const tokenAddress =
      networkConfig.contractAddresses.Token[
        token as keyof typeof networkConfig.contractAddresses.Token
      ];
    const chain = networkConfig.chain;

    // Convert amount to Wei once for all comparisons
    const tokenAmount = parseUnits(amount, 18);

    const data = encodeFunctionData({
      abi: lendingPoolABI,
      functionName: "repay",
      args: [tokenAddress, tokenAmount, account.address],
    });

    const gasLimit = BigInt(200000);
    const [gasPrice, nonce] = await Promise.all([
      publicClient.getGasPrice(),
      publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      }),
    ]);

    const txParams = prepareTransaction({
      account,
      to: contractAddress as `0x${string}`,
      data,
      gas: gasLimit,
      gasPrice,
      nonce: BigInt(nonce),
      chain: chain,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hash = await walletClient.sendTransaction(txParams as any);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const formattedReceipt = {
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber.toString(),
      contractAddress: receipt.contractAddress,
      cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice.toString(),
      from: receipt.from,
      gasUsed: receipt.gasUsed.toString(),
      logs: receipt.logs.map((log) => ({
        ...log,
        blockNumber: log.blockNumber.toString(),
        logIndex: log.logIndex.toString(),
        transactionIndex: log.transactionIndex.toString(),
      })),
      logsBloom: receipt.logsBloom,
      status: receipt.status,
      to: receipt.to,
      transactionHash: receipt.transactionHash,
      transactionIndex: receipt.transactionIndex.toString(),
      type: receipt.type,
    };

    return {
      success: receipt.status === "success",
      transactionHash: hash,
      receipt: formattedReceipt,
    };
  } catch (error) {
    console.error("Repay error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.cause : undefined,
    };
  }
};

const listToken = async ({
  chainId,
  tokenAddress,
}: {
  chainId: number;
  tokenAddress: string;
}) => {
  try {
    const { publicClient, walletClient } = await initalizeClients({ chainId });
    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    if (!networkConfig) {
      throw new Error("Network config not found");
    }
    if (!process.env.PRIVATE_KEY) {
      throw new Error("Private key not found");
    }
    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
    const chain = networkConfig.chain;
    const contractAddress = networkConfig.contractAddresses.LendingPool;
    try {
      const isListed = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: lendingPoolABI,
        functionName: "tokenData",
        args: [tokenAddress],
      });
      console.log("Token data:", isListed);
    } catch (error) {
      // If we get an error, the token might not be listed yet
      console.log(
        "Token might not be listed yet:",
        error instanceof Error ? error.message : String(error)
      );
    }
    try {
      const owner = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: lendingPoolABI,
        functionName: "owner",
      });
      if (!owner) {
        throw new Error("Contract owner not found");
      }

      if (owner !== account.address.toLowerCase()) {
        console.warn(
          "Warning: Your address is not the contract owner. You might not have permission to list tokens."
        );
      }
    } catch (error) {
      console.error(
        "Error checking contract ownership:",
        error instanceof Error ? error.message : String(error)
      );
    }

    const [gasPrice, nonce] = await Promise.all([
      publicClient.getGasPrice(),
      publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      }),
    ]);

    const gasLimit = BigInt(300000);

    const useAlternativeFormat = true;

    let collateralFactor,
      borrowFactor,
      liquidationThreshold,
      liquidationPenalty,
      reserveFactor;

    if (useAlternativeFormat) {
      // Use basis points format (0-10000 scale)
      collateralFactor = BigInt(500); // 5% in basis points
      borrowFactor = BigInt(1000); // 10% in basis points
      liquidationThreshold = BigInt(750); // 7.5% in basis points
      liquidationPenalty = BigInt(100); // 1% in basis points
      reserveFactor = BigInt(100); // 1% in basis points
    } else {
      collateralFactor = ethers.utils.parseUnits("0.05", 18); // 5% collateral factor
      borrowFactor = ethers.utils.parseUnits("0.1", 18); // 10% borrow factor
      liquidationThreshold = ethers.utils.parseUnits("0.075", 18); // 7.5% liquidation threshold
      liquidationPenalty = ethers.utils.parseUnits("0.01", 18); // 1% liquidation penalty
      reserveFactor = ethers.utils.parseUnits("0.01", 18); // 1% reserve factor
    }
    try {
      const listTokenFunction = lendingPoolABI.find(
        (item) => item.name === "listToken" && item.type === "function"
      );
      console.log(
        "listToken function definition:",
        JSON.stringify(listTokenFunction)
      );

      const otherRelevantFunctions = lendingPoolABI.filter(
        (item) =>
          item.type === "function" &&
          [
            "getCollateralFactor",
            "getBorrowFactor",
            "getLiquidationThreshold",
          ].includes(item.name as string)
      );
      console.log(
        "Other relevant functions:",
        JSON.stringify(otherRelevantFunctions)
      );
    } catch (error) {
      console.error(
        "Error accessing ABI:",
        error instanceof Error ? error.message : String(error)
      );
    }

    const data = encodeFunctionData({
      abi: lendingPoolABI,
      functionName: "listToken",
      args: [
        tokenAddress,
        BigInt(collateralFactor.toString()),
        BigInt(borrowFactor.toString()),
        BigInt(liquidationThreshold.toString()),
        BigInt(liquidationPenalty.toString()),
        BigInt(reserveFactor.toString()),
      ],
    });

    console.log("Sending transaction...");

    // First, simulate the transaction to check for errors
    try {
      console.log("Simulating transaction first...");
      await publicClient.simulateContract({
        address: contractAddress as `0x${string}`,
        abi: lendingPoolABI,
        functionName: "listToken",
        args: [
          tokenAddress,
          BigInt(collateralFactor.toString()),
          BigInt(borrowFactor.toString()),
          BigInt(liquidationThreshold.toString()),
          BigInt(liquidationPenalty.toString()),
          BigInt(reserveFactor.toString()),
        ],
        account: account.address,
      });
      console.log("Simulation successful! Transaction should succeed.");
    } catch (error) {
      console.error(
        "Simulation failed:",
        error instanceof Error ? error.message : String(error)
      );
      console.error(
        "Error details:",
        error instanceof Error && error.cause
          ? (error.cause as Error).message
          : "No additional details"
      );

      // Return early if simulation fails
      return {
        success: false,
        error:
          "Transaction simulation failed: " +
          (error instanceof Error ? error.message : String(error)),
        simulationError:
          error instanceof Error && error.cause
            ? (error.cause as Error).message
            : null,
      };
    }

    const txParams = prepareTransaction({
      account,
      to: contractAddress as `0x${string}`,
      data,
      gas: gasLimit,
      gasPrice,
      nonce: BigInt(nonce),
      chain: chain,
    });

    console.log("Sending actual transaction...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hash = await walletClient.sendTransaction(txParams as any);
    console.log("Transaction sent, hash:", hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Transaction status:", receipt.status);

    if (receipt.status === "reverted") {
      console.error("Transaction reverted despite successful simulation!");
      // Additional debug info
      try {
        const contractCode = await publicClient.getBytecode({
          address: contractAddress as `0x${string}`,
        });
        console.log("Contract exists:", !!contractCode);

        // Try with different gas limit
        console.log(
          "This might be a gas issue. Recommend trying with higher gas limit."
        );
      } catch (error) {
        console.error(
          "Error getting additional debug info:",
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    const formattedReceipt = {
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber.toString(),
      contractAddress: receipt.contractAddress,
      cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice.toString(),
      from: receipt.from,
      gasUsed: receipt.gasUsed.toString(),
      logs: receipt.logs.map((log) => ({
        ...log,
        blockNumber: log.blockNumber.toString(),
        logIndex: log.logIndex.toString(),
        transactionIndex: log.transactionIndex.toString(),
      })),
      logsBloom: receipt.logsBloom,
      status: receipt.status,
      to: receipt.to,
      transactionHash: receipt.transactionHash,
      transactionIndex: receipt.transactionIndex.toString(),
      type: receipt.type,
    };

    return {
      success: receipt.status === "success",
      transactionHash: hash,
      receipt: formattedReceipt,
      error:
        receipt.status === "reverted"
          ? "Transaction reverted. Check logs for details."
          : null,
    };
  } catch (error) {
    console.error("List token error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during token listing",
      details: error instanceof Error ? error.cause : {},
    };
  }
};

const createPool = async ({
  chainId,
  stakingToken,
  rewardPerSecond,
  startTime,
  endTime,
}: {
  chainId: number;
  stakingToken: string;
  rewardPerSecond: string;
  startTime: string;
  endTime: string;
}) => {
  try {
    const { publicClient, walletClient } = await initalizeClients({ chainId });
    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    if (!networkConfig) {
      throw new Error("Network config not found");
    }
    const chain = networkConfig.chain;
    const contractAddress = networkConfig.contractAddresses;
    const token =
      networkConfig.contractAddresses.Token[
        stakingToken as keyof typeof networkConfig.contractAddresses.Token
      ];
    if (!process.env.PRIVATE_KEY) {
      throw new Error("Private key not found");
    }
    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);

    // First, simulate the transaction to check for errors
    try {
      console.log("Simulating transaction first...");
      await publicClient.simulateContract({
        address: contractAddress.YieldFarming as `0x${string}`,
        abi: yieldFarmingABI,
        functionName: "createPool",
        args: [token, token, rewardPerSecond, startTime, endTime],
        account: account.address,
      });
      console.log("Simulation successful! Transaction should succeed.");
    } catch (error) {
      console.error(
        "Simulation failed:",
        error instanceof Error ? error.message : String(error)
      );
      console.error(
        "Error details:",
        error instanceof Error && error.cause
          ? (error.cause as Error).message
          : "No additional details"
      );

      // Return early if simulation fails
      return {
        success: false,
        error:
          "Transaction simulation failed: " +
          (error instanceof Error ? error.message : String(error)),
        simulationError:
          error instanceof Error && error.cause
            ? (error.cause as Error).message
            : null,
      };
    }

    const data = encodeFunctionData({
      abi: yieldFarmingABI,
      functionName: "createPool",
      args: [token, token, rewardPerSecond, startTime, endTime],
    });
    const gasLimit = BigInt(300000);
    const [gasPrice, nonce] = await Promise.all([
      publicClient.getGasPrice(),
      publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      }),
    ]);

    const txParams = prepareTransaction({
      account,
      to: contractAddress.YieldFarming as `0x${string}`,
      data,
      gas: gasLimit,
      gasPrice,
      nonce: BigInt(nonce),
      chain: chain,
    });

    console.log("Sending actual transaction...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hash = await walletClient.sendTransaction(txParams as any);
    console.log("Transaction sent, hash:", hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const formattedReceipt = {
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber.toString(),
      contractAddress: receipt.contractAddress,
      cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice.toString(),
      from: receipt.from,
      gasUsed: receipt.gasUsed.toString(),
      logs: receipt.logs.map((log) => ({
        ...log,
        blockNumber: log.blockNumber.toString(),
        logIndex: log.logIndex.toString(),
        transactionIndex: log.transactionIndex.toString(),
      })),
      logsBloom: receipt.logsBloom,
      status: receipt.status,
      to: receipt.to,
      transactionHash: receipt.transactionHash,
      transactionIndex: receipt.transactionIndex.toString(),
      type: receipt.type,
    };

    console.log("Transaction status:", receipt.status);

    if (receipt.status === "reverted") {
      console.error("Transaction reverted despite successful simulation!");
      // Additional debug info
      try {
        const contractCode = await publicClient.getBytecode({
          address: contractAddress.YieldFarming as `0x${string}`,
        });
        console.log("Contract exists:", !!contractCode);

        // Try with different gas limit
        console.log(
          "This might be a gas issue. Recommend trying with higher gas limit."
        );
      } catch (error) {
        console.error(
          "Error getting additional debug info:",
          error instanceof Error ? error.message : String(error)
        );
      }
    } else {
      // Pool was created successfully, get the new pool ID
      try {
        const poolLength = await publicClient.readContract({
          address: contractAddress.YieldFarming as `0x${string}`,
          abi: yieldFarmingABI,
          functionName: "poolLength",
        });

        if (poolLength !== undefined) {
          const newPoolId = Number(poolLength) - 1;
          console.log(`New pool created with ID: ${newPoolId}`);

          // Activate the pool
          const activateData = encodeFunctionData({
            abi: yieldFarmingABI,
            functionName: "activatePool",
            args: [BigInt(newPoolId)],
          });

          // Use type assertion for the transaction parameters
          const activateTxParams = prepareTransaction({
            account,
            to: contractAddress.YieldFarming as `0x${string}`,
            data: activateData,
            gas: gasLimit,
            gasPrice,
            nonce: BigInt(nonce) + BigInt(1), // Use next nonce as a number
            chain: chain,
          });

          console.log("Activating the pool...");
          const activateHash = await walletClient.sendTransaction(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            activateTxParams as any
          );
          console.log("Pool activation transaction sent, hash:", activateHash);

          await publicClient.waitForTransactionReceipt({ hash: activateHash });
          console.log("Pool activation completed");
        }
      } catch (activateError) {
        console.error(
          "Error activating pool:",
          activateError instanceof Error
            ? activateError.message
            : String(activateError)
        );
      }
    }

    return {
      success: receipt.status === "success",
      transactionHash: hash,
      receipt: formattedReceipt,
      poolActivationSuccess: true,
    };
  } catch (error) {
    console.error("Create pool error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during token listing",
      details: error instanceof Error ? error.cause : {},
    };
  }
};

const getPoolInformation = async ({ chainId }: { chainId: number }) => {
  const { publicClient } = await initalizeClients({ chainId });
  const networkConfig = Object.values(NETWORK_CONFIGS).find(
    (config) => config.chainId === chainId
  );
  if (!networkConfig) {
    throw new Error("Network config not found");
  }
  const contractAddress = networkConfig.contractAddresses;
  const poolLength = await publicClient.readContract({
    address: contractAddress.YieldFarming as `0x${string}`,
    abi: yieldFarmingABI,
    functionName: "poolLength",
  });
  console.log(`Total number of pools: ${poolLength}`);
  const pools = [];

  // Define a type for the raw pool data to avoid using 'any'
  type RawPoolInfo = [
    string, // stakingToken
    string, // rewardToken
    bigint, // rewardPerSecond
    bigint, // lastUpdateTime
    bigint, // accRewardPerShare
    bigint, // totalStaked
    bigint, // startTime
    bigint, // endTime
    boolean, // isActive
  ];

  for (let i = 0; i < Number(poolLength); i++) {
    try {
      const poolInfo = (await publicClient.readContract({
        address: contractAddress.YieldFarming as `0x${string}`,
        abi: yieldFarmingABI,
        functionName: "pools",
        args: [BigInt(i)],
      })) as RawPoolInfo;

      // Format the pool information with proper field names and readable values
      const formattedPoolInfo = {
        poolId: i,
        stakingToken: poolInfo[0],
        rewardToken: poolInfo[1],
        rewardPerSecond: {
          raw: poolInfo[2].toString(),
          formatted: formatUnits(poolInfo[2].toString(), 18),
        },
        lastUpdateTime: {
          timestamp: poolInfo[3].toString(),
          date: new Date(Number(poolInfo[3]) * 1000).toLocaleString(),
        },
        accRewardPerShare: {
          raw: poolInfo[4].toString(),
          formatted: formatUnits(poolInfo[4].toString(), 18),
        },
        totalStaked: {
          raw: poolInfo[5].toString(),
          formatted: formatUnits(poolInfo[5].toString(), 18),
        },
        startTime: {
          timestamp: poolInfo[6].toString(),
          date: new Date(Number(poolInfo[6]) * 1000).toLocaleString(),
        },
        endTime: {
          timestamp: poolInfo[7].toString(),
          date: new Date(Number(poolInfo[7]) * 1000).toLocaleString(),
        },
        isActive: poolInfo[8],
      };

      console.log(`Pool ${i} information:`, formattedPoolInfo);
      pools.push(formattedPoolInfo);
    } catch (error) {
      console.error(`Error fetching pool ${i}:`, error);
    }
  }
  return pools;
};

const stake = async ({
  chainId,
  poolId,
  amount,
}: {
  chainId: number;
  poolId: number;
  amount: string;
}) => {
  try {
    const { publicClient, walletClient } = await initalizeClients({ chainId });
    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    if (!networkConfig) {
      throw new Error("Network config not found");
    }
    const chain = networkConfig.chain;
    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
    if (!process.env.PRIVATE_KEY) {
      throw new Error("Private key not found");
    }
    const contractAddress = networkConfig.contractAddresses;

    // Get pool info to validate staking
    type RawPoolInfo = [
      string, // stakingToken
      string, // rewardToken
      bigint, // rewardPerSecond
      bigint, // lastUpdateTime
      bigint, // accRewardPerShare
      bigint, // totalStaked
      bigint, // startTime
      bigint, // endTime
      boolean, // isActive
    ];

    const poolInfo = (await publicClient.readContract({
      address: contractAddress.YieldFarming as `0x${string}`,
      abi: yieldFarmingABI,
      functionName: "pools",
      args: [BigInt(poolId)],
    })) as RawPoolInfo;

    if (!poolInfo) {
      throw new Error("Pool not found");
    }

    // Check if pool is active
    const isActive = poolInfo[8];
    if (!isActive) {
      return {
        success: false,
        error: "Staking is paused for this pool",
        details: {
          poolId,
          isActive: false,
          message: "The pool must be activated before staking",
        },
      };
    }

    const stakingToken = poolInfo[0];
    console.log(`Staking token address: ${stakingToken}`);

    // Check token balance first
    const tokenBalance = await publicClient.readContract({
      address: stakingToken as `0x${string}`,
      abi: mintABI,
      functionName: "balanceOf",
      args: [account.address],
    });
    console.log(`Token balance: ${tokenBalance}`);

    // Convert amount to Wei for consistent comparison
    const amountInWei = ethers.utils.parseUnits(amount, 18);
    const amountInWeiString = amountInWei.toString();

    // If balance is insufficient, use faucet to get tokens
    if (BigInt(tokenBalance as bigint) < BigInt(amountInWeiString)) {
      console.log("Insufficient token balance. Getting tokens from faucet...");

      const Amount = ethers.utils.parseUnits(amount, 18);
      const faucetData = encodeFunctionData({
        abi: mintABI,
        functionName: "faucet",
        args: [Amount], // 1,000,000 tokens with 18 decimals
      });

      const faucetParams = prepareTransaction({
        account,
        to: stakingToken as `0x${string}`,
        data: faucetData,
        gas: BigInt(100000),
        gasPrice: await publicClient.getGasPrice(),
        nonce: await publicClient.getTransactionCount({
          address: account.address,
          blockTag: "pending",
        }),
        chain: chain,
      });

      const faucetHash = await walletClient.sendTransaction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        faucetParams as any
      );
      console.log(`Faucet transaction sent, hash: ${faucetHash}`);

      const faucetReceipt = await publicClient.waitForTransactionReceipt({
        hash: faucetHash,
      });
      if (faucetReceipt.status === "reverted") {
        return {
          success: false,
          error: "Faucet transaction failed. Cannot obtain tokens.",
          transactionHash: faucetHash,
          receipt: faucetReceipt,
        };
      }

      // Check updated balance
      const updatedBalance = await publicClient.readContract({
        address: stakingToken as `0x${string}`,
        abi: mintABI,
        functionName: "balanceOf",
        args: [account.address],
      });
      console.log(`Updated token balance after faucet: ${updatedBalance}`);

      if (BigInt(updatedBalance as bigint) < BigInt(amountInWeiString)) {
        return {
          success: false,
          error: "Still insufficient balance after faucet",
          details: {
            required: amount,
            available: (updatedBalance as bigint).toString(),
          },
        };
      }
    }

    // Check token allowance for the YieldFarming contract
    const tokenAllowance = await publicClient.readContract({
      address: stakingToken as `0x${string}`,
      abi: mintABI,
      functionName: "allowance",
      args: [account.address, contractAddress.YieldFarming as `0x${string}`],
    });

    console.log(`Token allowance: ${tokenAllowance}`);

    // If allowance is not enough, approve tokens first
    if (BigInt(tokenAllowance as bigint) < BigInt(amountInWeiString)) {
      console.log("Approving tokens for staking...");

      const approveData = encodeFunctionData({
        abi: mintABI,
        functionName: "approve",
        args: [
          contractAddress.YieldFarming as `0x${string}`,
          BigInt(
            ethers.utils.parseUnits("1000000000000000000000000").toString()
          ),
        ],
      });

      const approveParams = prepareTransaction({
        account,
        to: stakingToken as `0x${string}`,
        data: approveData,
        gas: BigInt(100000),
        gasPrice: await publicClient.getGasPrice(),
        nonce: await publicClient.getTransactionCount({
          address: account.address,
          blockTag: "pending",
        }),
        chain: chain,
      });

      const approveHash = await walletClient.sendTransaction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        approveParams as any
      );
      console.log(`Approval transaction sent, hash: ${approveHash}`);

      const approveReceipt = await publicClient.waitForTransactionReceipt({
        hash: approveHash,
      });

      if (approveReceipt.status === "reverted") {
        return {
          success: false,
          error: "Approval transaction failed.",
          transactionHash: approveHash,
          receipt: approveReceipt,
        };
      }
    }

    // Prepare the staking transaction
    console.log("Preparing staking transaction...");

    const stakeData = encodeFunctionData({
      abi: yieldFarmingABI,
      functionName: "stake",
      args: [BigInt(amountInWeiString)],
    });

    const stakeParams = prepareTransaction({
      account,
      to: contractAddress.YieldFarming as `0x${string}`,
      data: stakeData,
      gas: BigInt(300000),
      gasPrice: await publicClient.getGasPrice(),
      nonce: await publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      }),
      chain: chain,
    });

    const hash = await walletClient.sendTransaction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stakeParams as any
    );
    console.log(`Staking transaction sent, hash: ${hash}`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "reverted") {
    return {
        success: false,
        error: "Transaction failed",
      transactionHash: hash,
        receipt,
      };
    }

      return {
      success: true,
      transactionHash: hash,
      receipt,
    };
  } catch (error) {
    console.error("Error in stake function:", error);
    return {
      success: false,
      error: extractRevertReason(error) || "An error occurred during staking",
      details: error,
    };
  }
};

/**
 * Initialize ethers client with browser wallet connection
 * @returns Provider, signer and utility functions for contract interaction
 */
export const initializeClient = async () => {
  try {
    // Check if window.ethereum exists (browser environment)
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error(
        "No wallet detected. Please install MetaMask or a compatible wallet"
      );
    }

    // Request account access
    await window.ethereum.request({ method: "eth_requestAccounts" });

    // Create ethers provider using browser wallet
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    // Get the signer from the connected wallet
    const signer = provider.getSigner();

    // Get connected address
    const address = await signer.getAddress();

    // Get current network
    const network = await provider.getNetwork();
    const chainId = network.chainId;

    // Function to create contract instance
    const getContract = (
      contractAddress: string,
      abi: readonly ethers.utils.Fragment[]
    ) => {
      return new ethers.Contract(contractAddress, abi, signer);
    };

    // Function to send transaction with proper error handling
    const sendTransaction = async (
      contract: ethers.Contract,
      functionName: string,
      args: unknown[],
      options = {}
    ) => {
      try {
        const tx = await contract[functionName](...args, options);
        const receipt = await tx.wait();

        return {
          success: true,
      transactionHash: receipt.transactionHash,
          receipt: receipt,
    };
  } catch (error) {
        console.error(`Transaction error in ${functionName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
          details: error instanceof Error ? error.cause : undefined,
    };
  }
};

    return {
      provider,
      signer,
      address,
  chainId,
      getContract,
      sendTransaction,
      isConnected: true,
    };
  } catch (error) {
    console.error("Failed to initialize client:", error);
    return {
      provider: null,
      signer: null,
      address: null,
      chainId: null,
      getContract: () => {
        throw new Error("Client not initialized");
      },
      sendTransaction: () => {
        throw new Error("Client not initialized");
      },
      isConnected: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// Update integration object to include the new client initialization function
export const integration = {
  deposit,
  withdraw,
  borrow,
  repay,
  listToken,
  createPool,
  stake,
  formatUnits,
  parseUnits,
  getPricePrediction,
  getTokenInsights,
  getTokenInfo,
  bridgeTokens,
  resolveEnsName,
  addBalancerLiquidity,
  getPoolInformation: sdkGetPoolInformation,
  initializeClient,
};
