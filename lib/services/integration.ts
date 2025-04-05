/**
 * Integration Service
 *
 * This service provides integration with blockchain networks using ethers.js
 * It handles transaction signing and other blockchain operations
 */

import { BigNumber, ethers } from "ethers";
import mintABI from "../../artifacts/MockToken.json";
import lendingPoolABI from "../../artifacts/LendingPool.json";
import priceOracleABI from "../../artifacts/PriceOracle.json";
import yieldFarmingABI from "../../artifacts/YieldFarm.json";
import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  Account,
  Chain,
  Authorization,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores, rootstockTestnet } from "viem/chains";

type TransactionRequest = {
  account: Account;
  to: `0x${string}`;
  data: `0x${string}`;
  gas: bigint;
  gasPrice: bigint;
  nonce: bigint;
  chain: Chain;
  value?: bigint;
  type?: "legacy" | "eip2930" | "eip1559";
  authorizationList?: Authorization[];
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

const initalizeClients = async ({ chainId }: { chainId: number }) => {
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
  const chain = networkConfig.chain;
  const publicClient = createPublicClient({
    chain,
    transport: http(process.env.RPC_URL),
  });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(process.env.RPC_URL),
  });
  return { publicClient, walletClient };
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

        const txParams: TransactionRequest = {
          account,
          to: tokenAddress as `0x${string}`,
          data,
          gas: gasLimit,
          gasPrice,
          nonce: BigInt(nonce) + BigInt(results.length),
          chain: networkConfig.chain,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hash = await walletClient.sendTransaction(txParams as any);
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

const setTokenPrice = async ({
  chainId,
  token,
  price,
}: {
  chainId: number;
  token: string;
  price: string;
}) => {
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
  const contractAddress = networkConfig.contractAddresses.PriceOracle;
  const tokenAddress =
    networkConfig.contractAddresses.Token[
      token as keyof typeof networkConfig.contractAddresses.Token
    ];

  const data = encodeFunctionData({
    abi: priceOracleABI,
    functionName: "setTokenPrice",
    args: [tokenAddress, price],
  });

  const gasLimit = BigInt(100000);
  const [gasPrice, nonce] = await Promise.all([
    publicClient.getGasPrice(),
    publicClient.getTransactionCount({
      address: account.address,
      blockTag: "pending",
    }),
  ]);
  const txParams: TransactionRequest = {
    account,
    to: contractAddress as `0x${string}`,
    data,
    gas: gasLimit,
    gasPrice,
    nonce: BigInt(nonce),
    chain: networkConfig.chain,
  };

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
    success: receipt.status !== "reverted",
    transactionHash: hash,
    receipt: formattedReceipt,
  };
};

const getTokenBalance = async ({
  chainId,
  token,
}: {
  chainId: number;
  token: string;
}) => {
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
  const balance = await publicClient.readContract({
    address: tokenAddress as `0x${string}`,
    abi: mintABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  return BigInt(balance as bigint).toString();
};

const checkAllowance = async ({ chainId }: { chainId: number }) => {
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
    const tokenAllowance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: mintABI,
      functionName: "allowance",
      args: [
        account.address,
        networkConfig.contractAddresses.LendingPool as `0x${string}`,
      ],
    });
    allowances.push({
      token: tokenSymbol,
      allowance: BigInt(tokenAllowance as bigint).toString(),
    });
  }
  return allowances;
};

const fundFaucet = async ({ chainId }: { chainId: number }) => {
  try {
    const { publicClient, walletClient } = await initalizeClients({ chainId });
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
    const gasLimit = BigInt(100000);
    const [gasPrice] = await Promise.all([publicClient.getGasPrice()]);
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
        const txParams = {
          account,
          to: tokenAddress as `0x${string}`,
          data,
          gas: gasLimit,
          gasPrice,
          chain: networkConfig.chain,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hash = await walletClient.sendTransaction(txParams as any);
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
          success: receipt.status !== "reverted",
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
    const { publicClient, walletClient } = await initalizeClients({ chainId });
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
    const chain = networkConfig.chain;
    const contractAddress = networkConfig.contractAddresses.LendingPool;
    const tokenAddress =
      networkConfig.contractAddresses.Token[
        token as keyof typeof networkConfig.contractAddresses.Token
      ];

    // Check token-specific allowance
    const allowances = await checkAllowance({ chainId });
    const tokenAllowance = allowances.find((a) => a.token === token);

    if (!tokenAllowance || BigInt(tokenAllowance.allowance) < BigInt(amount)) {
      const approvalResults = await approveWithWagmi({ chainId });
      console.log("Approval results:", JSON.stringify(approvalResults));

      const updatedAllowances = await checkAllowance({ chainId });
      const updatedTokenAllowance = updatedAllowances.find(
        (a) => a.token === token
      );

      if (
        !updatedTokenAllowance ||
        BigInt(updatedTokenAllowance.allowance) < BigInt(amount)
      ) {
        throw new Error(`Failed to approve enough ${token} tokens for deposit`);
      }
    }

    // Check token balance
    const tokenBalance = await getTokenBalance({ chainId, token });

    if (BigInt(tokenBalance) < BigInt(amount)) {
      const faucetResults = await fundFaucet({ chainId });
      console.log("Faucet results:", JSON.stringify(faucetResults));

      // Verify balance was updated
      const updatedBalance = await getTokenBalance({ chainId, token });

      if (BigInt(updatedBalance) < BigInt(amount)) {
        throw new Error(`Failed to get enough ${token} tokens from faucet`);
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

    const txParams = {
      account,
      to: contractAddress as `0x${string}`,
      data,
      gas: gasLimit,
      gasPrice,
      nonce: Number(nonce),
      chain: chain,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hash = await walletClient.sendTransaction(txParams as any);

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
      success: receipt.status !== "reverted",
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
    const { publicClient, walletClient } = await initalizeClients({ chainId });
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
    const chain = networkConfig.chain;
    const contractAddress = networkConfig.contractAddresses.LendingPool;
    const tokenAddress =
      networkConfig.contractAddresses.Token[
        token as keyof typeof networkConfig.contractAddresses.Token
      ];

    // Check token balance
    const tokenBalance = await getTokenBalance({ chainId, token });

    console.log(`${token} balance:`, tokenBalance);

    if (BigInt(tokenBalance) < BigInt(amount)) {
      console.log(`Insufficient ${token} balance, getting from faucet...`);
      const faucetResults = await fundFaucet({ chainId });
      console.log("Faucet results:", JSON.stringify(faucetResults));

      // Verify balance was updated
      const updatedBalance = await getTokenBalance({ chainId, token });

      if (BigInt(updatedBalance) < BigInt(amount)) {
        throw new Error(`Failed to get enough ${token} tokens from faucet`);
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

    const data = encodeFunctionData({
      abi: lendingPoolABI,
      functionName: "withdraw",
      args: [tokenAddress, tokenAmount],
    });

    const txParams = {
      account,
      to: contractAddress,
      data,
      gas: gasLimit,
      gasPrice,
      nonce: BigInt(nonce),
      chain: chain,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hash = await walletClient.sendTransaction(txParams as any);

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
      success: receipt.status !== "reverted",
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
    const contractAddress = networkConfig.contractAddresses.LendingPool;
    const tokenAddress =
      networkConfig.contractAddresses.Token[
        token as keyof typeof networkConfig.contractAddresses.Token
      ];
    
      const tokenAmount = parseUnits(amount, 18);
    
    const data = encodeFunctionData({
      abi: lendingPoolABI,
      functionName: "borrow",
      args: [tokenAddress, tokenAmount],
    });

    const gasLimit = BigInt(200000);
    const [gasPrice, nonce] = await Promise.all([
      publicClient.getGasPrice(),
      publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      }),
    ]);

    const txParams = {
      account,
      to: contractAddress,
      data,
      gas: gasLimit,
      gasPrice,
      nonce: BigInt(nonce),
      chain: chain,
    };

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
      success: receipt.status !== "reverted",
      transactionHash: hash,
      receipt: formattedReceipt,
    };
  } catch (error) {
    console.error("Borrow error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.cause : undefined,
    };
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

    const data = encodeFunctionData({
      abi: lendingPoolABI,
      functionName: "repay",
      args: [tokenAddress, BigInt(amount), account.address],
    });

    const gasLimit = BigInt(200000);
    const [gasPrice, nonce] = await Promise.all([
      publicClient.getGasPrice(),
      publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      }),
    ]);

    const txParams = {
      account,
      to: contractAddress,
      data,
      gas: gasLimit,
      gasPrice,
      nonce: BigInt(nonce),
      chain: chain,
    };

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
      success: receipt.status !== "reverted",
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

    const txParams = {
      account,
      to: contractAddress as `0x${string}`,
      data,
      gas: gasLimit,
      gasPrice,
      nonce: BigInt(nonce),
      chain: chain,
    };

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
      success: receipt.status !== "reverted",
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

    const txParams = {
      account,
      to: contractAddress.YieldFarming as `0x${string}`,
      data,
      gas: gasLimit,
      gasPrice,
      nonce: BigInt(nonce),
      chain: chain,
    };

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
          const activateTxParams = {
            account,
            to: contractAddress.YieldFarming as `0x${string}`,
            data: activateData,
            gas: gasLimit,
            gasPrice,
            nonce: Number(nonce) + 1, // Use next nonce as a number
            chain: chain,
          };

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
      success: receipt.status !== "reverted",
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
  for (let i = 0; i < Number(poolLength) - 1; i++) {
    const poolInfo = await publicClient.readContract({
      address: contractAddress.YieldFarming as `0x${string}`,
      abi: yieldFarmingABI,
      functionName: "getPoolInfo",
    });
    console.log(`Pool ${i} information:`, poolInfo);
  }
};

export const integration = {
  formatUnits,
  parseUnits,
  approve: approveWithWagmi,
  deposit,
  getTokenBalance,
  checkAllowance,
  withdraw,
  borrow,
  repay,
  listToken,
  setTokenPrice,
  createPool,
  getPoolInformation,
};
