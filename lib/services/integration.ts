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
    success: receipt.status === "success",
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

    // Check if the lending pool has sufficient liquidity
    try {
      const getAvailableLiquidity = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: lendingPoolABI,
        functionName: "getAvailableLiquidity",
        args: [tokenAddress],
      });

      const liquidityBigInt = getAvailableLiquidity as bigint;
      const requestedAmount = parseUnits(amount, 18);

      if (liquidityBigInt < BigInt(requestedAmount.toString())) {
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
          BigInt(parseUnits(amount, 18).toString()),
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

    const tokenAmount = parseUnits(amount, 18);

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

    const txParams = {
      account,
      to: contractAddress,
      data,
      gas: gasLimit,
      gasPrice: adjustedGasPrice,
      nonce: BigInt(nonce),
      chain: chain,
    };

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
    boolean // isActive
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
      boolean // isActive
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

    // If balance is insufficient, use faucet to get tokens
    if (BigInt(tokenBalance as bigint) < BigInt(amount)) {
      console.log("Insufficient token balance. Getting tokens from faucet...");

      const Amount = ethers.utils.parseUnits(amount, 18);
      const faucetData = encodeFunctionData({
        abi: mintABI,
        functionName: "faucet",
        args: [Amount], // 1,000,000 tokens with 18 decimals
      });

      const faucetParams = {
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
      };

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

      if (BigInt(updatedBalance as bigint) < BigInt(amount)) {
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
    if (BigInt(tokenAllowance as bigint) < BigInt(amount)) {
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

      const approveParams = {
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
      };

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
          error: "Token approval failed",
          transactionHash: approveHash,
          receipt: approveReceipt,
        };
      }
    }

    // Simulate the staking transaction first
    try {
      console.log("Simulating stake transaction...");
      await publicClient.simulateContract({
        address: contractAddress.YieldFarming as `0x${string}`,
        abi: yieldFarmingABI,
        functionName: "stake",
        args: [BigInt(poolId), ethers.utils.parseUnits(amount, 18)],
        account: account.address,
      });
      console.log("Simulation successful, proceeding with actual transaction");
    } catch (simulationError) {
      console.error("Stake simulation failed:", simulationError);

      // Check if this is the StakingPaused error (0xfb8f41b2)
      const errorMessage =
        simulationError instanceof Error
          ? simulationError.message
          : String(simulationError);
      if (errorMessage.includes("0xfb8f41b2")) {
        return {
          success: false,
          error: "Staking is paused for this pool",
          details: {
            poolId,
            errorCode: "0xfb8f41b2",
            errorName: "StakingPaused",
          },
        };
      }

      return {
        success: false,
        error: `Simulation failed: ${errorMessage}`,
        details: simulationError instanceof Error ? simulationError.cause : {},
      };
    }

    const stakeData = encodeFunctionData({
      abi: yieldFarmingABI,
      functionName: "stake",
      args: [BigInt(poolId), ethers.utils.parseUnits(amount, 18)],
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
      data: stakeData,
      gas: gasLimit,
      gasPrice,
      nonce: Number(nonce),
      chain: chain,
    };

    console.log("Sending stake transaction...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hash = await walletClient.sendTransaction(txParams as any);
    console.log("Stake transaction sent, hash:", hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "reverted") {
      console.error("Stake transaction reverted!");
      try {
        const revertReason = await publicClient.call({
          account: account.address,
          to: contractAddress.YieldFarming as `0x${string}`,
          data: stakeData,
          gas: gasLimit,
          gasPrice,
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
    console.error("Error in stake:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.cause : {},
    };
  }
};

const unstake = async ({
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

    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
    if (!process.env.PRIVATE_KEY) {
      throw new Error("Private key not found");
    }

    if (!networkConfig) {
      throw new Error("Network config not found");
    }

    const chain = networkConfig.chain;
    const contractAddress = networkConfig.contractAddresses;

    // Get pool info to validate unstaking
    type RawPoolInfo = [
      string, // stakingToken
      string, // rewardToken
      bigint, // rewardPerSecond
      bigint, // lastUpdateTime
      bigint, // accRewardPerShare
      bigint, // totalStaked
      bigint, // startTime
      bigint, // endTime
      boolean // isActive
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

    const stakingToken = poolInfo[0];
    console.log(`Staking token address: ${stakingToken}`);

    // Check token balance first
    const tokenBalance = await publicClient.readContract({
      address: stakingToken as `0x${string}`,
      abi: mintABI,
      functionName: "balanceOf",
      args: [account.address],
    });

    // If balance is insufficient, use faucet to get tokens
    if (BigInt(tokenBalance as bigint) < BigInt(amount)) {
      console.log("Insufficient token balance. Getting tokens from faucet...");
    }

    // Check token allowance for the YieldFarming contract
    const tokenAllowance = await publicClient.readContract({
      address: stakingToken as `0x${string}`,
      abi: mintABI,
      functionName: "allowance",
      args: [account.address, contractAddress.YieldFarming as `0x${string}`],
    });

    // If allowance is not enough, approve tokens first
    if (BigInt(tokenAllowance as bigint) < BigInt(amount)) {
      console.log("Approving tokens for unstaking...");
    }

    // Simulate the unstaking transaction first
    try {
      console.log("Simulating unstake transaction...");
      await publicClient.simulateContract({
        address: contractAddress.YieldFarming as `0x${string}`,
        abi: yieldFarmingABI,
        functionName: "unstake",
        args: [BigInt(poolId), ethers.utils.parseUnits(amount)],
        account: account.address,
      });
      console.log("Simulation successful, proceeding with actual transaction");
    } catch (simulationError) {
      console.error("Unstake simulation failed:", simulationError);
      return {
        success: false,
        error: `Simulation failed: ${
          simulationError instanceof Error
            ? simulationError.message
            : String(simulationError)
        }`,
        details: simulationError instanceof Error ? simulationError.cause : {},
      };
    }

    const unstakeData = encodeFunctionData({
      abi: yieldFarmingABI,
      functionName: "unstake",
      args: [BigInt(poolId), ethers.utils.parseUnits(amount)],
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
      data: unstakeData,
      gas: gasLimit,
      gasPrice,
      nonce: Number(nonce),
      chain: chain,
    };

    console.log("Sending unstake transaction...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hash = await walletClient.sendTransaction(txParams as any);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "reverted") {
      console.error("Unstake transaction reverted!");
      try {
        const revertReason = await publicClient.call({
          account: account.address,
          to: contractAddress.YieldFarming as `0x${string}`,
          data: unstakeData,
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
    console.error("Error in unstake:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.cause : {},
    };
  }
};

// Get user information for all pools
const getUserPoolInfo = async ({ chainId }: { chainId: number }) => {
  try {
    const { publicClient } = await initalizeClients({ chainId });
    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    if (!networkConfig) {
      throw new Error("Network config not found");
    }
    const contractAddress = networkConfig.contractAddresses;

    const poolLength = (await publicClient.readContract({
      address: contractAddress.YieldFarming as `0x${string}`,
      abi: yieldFarmingABI,
      functionName: "poolLength",
    })) as bigint;

    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
    const userAddress = account.address;
    const userPoolInfo = [];

    for (let i = 0; i < Number(poolLength); i++) {
      try {
        const info = (await publicClient.readContract({
          address: contractAddress.YieldFarming as `0x${string}`,
          abi: yieldFarmingABI,
          functionName: "userInfo",
          args: [BigInt(i), userAddress as `0x${string}`],
        })) as [bigint, bigint];

        const formattedInfo = {
          poolId: i,
          stakedAmount: {
            raw: info[0].toString(),
            formatted: formatUnits(info[0].toString(), 18),
          },
          rewardDebt: {
            raw: info[1].toString(),
            formatted: formatUnits(info[1].toString(), 18),
          },
        };

        userPoolInfo.push(formattedInfo);
      } catch (error) {
        console.error(`Error fetching user info for pool ${i}:`, error);
      }
    }

    return userPoolInfo;
  } catch (error) {
    console.error("Error in getUserInfo:", error);
    throw error;
  }
};

const claimRewards = async ({
  chainId,
  poolId,
}: {
  chainId: number;
  poolId: number;
}) => {
  try {
    const { publicClient, walletClient } = await initalizeClients({ chainId });
    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    if (!networkConfig) {
      throw new Error("Network config not found");
    }
    const contractAddress = networkConfig.contractAddresses;

    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);

    const claimRewardsData = encodeFunctionData({
      abi: yieldFarmingABI,
      functionName: "claimRewards",
      args: [BigInt(poolId)],
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
      data: claimRewardsData,
      gas: gasLimit,
      gasPrice,
      nonce: Number(nonce),
      chain: networkConfig.chain,
    };

    console.log("Sending claim rewards transaction...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hash = await walletClient.sendTransaction(txParams as any);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "reverted") {
      console.error("Claim rewards transaction reverted!");
      try {
        const revertReason = await publicClient.call({
          account: account.address,
          to: contractAddress.YieldFarming as `0x${string}`,
          data: claimRewardsData,
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
    console.error("Error in claimRewards:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.cause : {},
    };
  }
};

const emergencyWithdraw = async ({
  chainId,
  poolId,
}: {
  chainId: number;
  poolId: number;
}) => {
  try {
    const { publicClient, walletClient } = await initalizeClients({ chainId });

    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    if (!networkConfig) {
      throw new Error("Network config not found");
    }

    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);

    const emergencyWithdrawData = encodeFunctionData({
      abi: yieldFarmingABI,
      functionName: "emergencyWithdraw",
      args: [BigInt(poolId)],
    });

    const gasLimit = BigInt(300000);
    const [gasPrice, nonce] = await Promise.all([
      publicClient.getGasPrice(),
      publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      }),
    ]);

    if (!networkConfig) {
      throw new Error("Network config not found");
    }

    const contractAddress = networkConfig.contractAddresses;

    const txParams = {
      account,
      to: contractAddress.YieldFarming as `0x${string}`,
      data: emergencyWithdrawData,
      gas: gasLimit,
      gasPrice,
      nonce: Number(nonce),
    };

    const hash = await walletClient.sendTransaction(txParams);

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
    console.error("Error in emergencyWithdraw:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.cause : {},
    };
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
  stake,
  getUserPoolInfo,
  unstake,
  claimRewards,
  emergencyWithdraw,
};
