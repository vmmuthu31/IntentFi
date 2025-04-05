/**
 * Integration Service
 *
 * This service provides integration with blockchain networks using ethers.js
 * It handles transaction signing and other blockchain operations
 */

const { ethers } = require("ethers");
const mintABI = require("../../artifacts/MockToken.json");
const lendingPoolABI = require("../../artifacts/LendingPool.json");
const {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
} = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { celoAlfajores, rootstockTestnet } = require("viem/chains");

// Cache provider and wallet instances
let provider;
let wallet;

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
      YieldFarm: "0xa2AE5cB0B0E23f710887BE2676F1381fb9e4fe44",
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
const formatUnits = (value, decimals = 18) => {
  return ethers.utils.formatUnits(value, decimals);
};

/**
 * Parse units from human-readable form to wei
 * @param {string} value Value to parse
 * @param {number} decimals Number of decimals
 * @returns {BigNumber} Parsed value
 */
const parseUnits = (value, decimals = 18) => {
  return ethers.utils.parseUnits(value.toString(), decimals);
};

const initalizeClients = async ({ chainId }) => {
  const account = privateKeyToAccount(process.env.PRIVATE_KEY);
  const networkConfig = Object.values(NETWORK_CONFIGS).find(
    (config) => config.chainId === chainId
  );
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
const approveWithWagmi = async ({ chainId }) => {
  try {
    const { publicClient, walletClient } = await initalizeClients({ chainId });
    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    const spenderAddress = networkConfig.contractAddresses.LendingPool;
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

        const txParams = {
          account,
          to: tokenAddress,
          data,
          gas: gasLimit,
          gasPrice,
          nonce: BigInt(nonce) + BigInt(results.length),
          chain: chain,
        };

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
      } catch (tokenError) {
        results.push({
          token: tokenSymbol,
          success: false,
          error: tokenError.shortMessage || tokenError.message,
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
  } catch (error) {
    console.error("Transaction Error:", {
      message: error.message,
      details: error.details,
      stack: error.stack,
    });

    if (error.message && error.message.includes("insufficient funds")) {
      return {
        success: false,
        error: "Insufficient funds for transaction",
        details: {
          message:
            "Please fund your account with testnet CELO using the faucet",
          faucetUrl: "https://faucet.celo.org/alfajores",
          chain: chain,
        },
      };
    }

    return {
      success: false,
      error: error.shortMessage || error.message,
      details: {
        code: error.code,
        parameters: error.metaMessages,
      },
    };
  }
};

const getTokenBalance = async ({ chainId, token }) => {
  const { publicClient } = await initalizeClients({ chainId });
  const account = privateKeyToAccount(process.env.PRIVATE_KEY);
  const networkConfig = Object.values(NETWORK_CONFIGS).find(
    (config) => config.chainId === chainId
  );
  const tokenAddress = networkConfig.contractAddresses.Token[token];
  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: mintABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  return BigInt(balance).toString();
};

const checkAllowance = async ({ chainId }) => {
  const { publicClient } = await initalizeClients({ chainId });
  const account = privateKeyToAccount(process.env.PRIVATE_KEY);
  const networkConfig = Object.values(NETWORK_CONFIGS).find(
    (config) => config.chainId === chainId
  );
  const tokens = networkConfig.contractAddresses.Token;
  let allowances = [];
  for (const [tokenSymbol, tokenAddress] of Object.entries(tokens)) {
    const tokenAllowance = await publicClient.readContract({
      address: tokenAddress,
      abi: mintABI,
      functionName: "allowance",
      args: [account.address, networkConfig.contractAddresses.LendingPool],
    });
    allowances.push({
      token: tokenSymbol,
      allowance: BigInt(tokenAllowance).toString(),
    });
  }
  return allowances;
};

const fundFaucet = async ({ chainId }) => {
  try {
    const { publicClient, walletClient } = await initalizeClients({ chainId });
    const account = privateKeyToAccount(process.env.PRIVATE_KEY);
    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
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
          to: tokenAddress,
          data,
          gas: gasLimit,
          gasPrice,
          chain: networkConfig.chain,
        };
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
          success: receipt.status !== "reverted",
          transactionHash: hash,
          receipt: formattedReceipt,
        });
      } catch (error) {
        console.error(`Error funding ${tokenSymbol}:`, error.message);
        results.push({
          token: tokenSymbol,
          success: false,
          error: error.message,
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
      error: error.message,
    };
  }
};

const deposit = async ({ chainId, token, amount }) => {
  try {
    const { publicClient, walletClient } = await initalizeClients({ chainId });
    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    const chain = networkConfig.chain;
    const account = privateKeyToAccount(process.env.PRIVATE_KEY);
    const contractAddress = networkConfig.contractAddresses.LendingPool;
    const tokenAddress = networkConfig.contractAddresses.Token[token];

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

    const data = encodeFunctionData({
      abi: lendingPoolABI,
      functionName: "deposit",
      args: [tokenAddress, BigInt(amount)],
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

    const hash = await walletClient.sendTransaction(txParams);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "reverted") {
      console.error("Transaction reverted!");

      // Try to decode the revert reason if possible
      try {
        const revertReason = await publicClient.call({
          account: account.address,
          to: contractAddress,
          data,
          gas: gasLimit,
          gasPrice,
          nonce: BigInt(nonce),
        });
        console.log("Revert reason:", revertReason);
      } catch (error) {
        console.error("Error getting revert reason:", error.message);
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
      error: error.message || "Unknown error during deposit",
      details: error.details || {},
    };
  }
};

const withdraw = async ({ chainId, token, amount }) => {
  try {
    const { publicClient, walletClient } = await initalizeClients({ chainId });
    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    const chain = networkConfig.chain;
    const account = privateKeyToAccount(process.env.PRIVATE_KEY);
    const contractAddress = networkConfig.contractAddresses.LendingPool;
    const tokenAddress = networkConfig.contractAddresses.Token[token];

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

    const data = encodeFunctionData({
      abi: lendingPoolABI,
      functionName: "withdraw",
      args: [tokenAddress, BigInt(amount)],
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

    const hash = await walletClient.sendTransaction(txParams);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "reverted") {
      console.error("Transaction reverted!");

      // Try to decode the revert reason if possible
      try {
        const revertReason = await publicClient.call({
          account: account.address,
          to: contractAddress,
          data,
          gas: gasLimit,
          gasPrice,
          nonce: BigInt(nonce),
        });
        console.log("Revert reason:", revertReason);
      } catch (error) {
        console.error("Error getting revert reason:", error.message);
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
      error: error.message || "Unknown error during withdraw",
      details: error.details || {},
    };
  }
};

// borrow
// token:
// address
// amount:
// uint256

const borrow = async ({ chainId, token, amount }) => {
  try {
    const { publicClient, walletClient } = await initalizeClients({ chainId });
    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    const chain = networkConfig.chain;
    const account = privateKeyToAccount(process.env.PRIVATE_KEY);
    const contractAddress = networkConfig.contractAddresses.LendingPool;
    const tokenAddress = networkConfig.contractAddresses.Token[token];

    const data = encodeFunctionData({
      abi: lendingPoolABI,
      functionName: "borrow",
      args: [tokenAddress, BigInt(amount)],
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
      success: receipt.status !== "reverted",
      transactionHash: hash,
      receipt: formattedReceipt,
    };
  } catch (error) {
    console.error("Borrow error:", error);
    return {
      success: false,
      error: error.message || "Unknown error during borrow",
      details: error.details || {},
    };
  }
};

const repay = async ({ chainId, token, amount }) => {
  try {
    const { publicClient, walletClient } = await initalizeClients({ chainId });
    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    const chain = networkConfig.chain;
    const account = privateKeyToAccount(process.env.PRIVATE_KEY);
    const contractAddress = networkConfig.contractAddresses.LendingPool;
    const tokenAddress = networkConfig.contractAddresses.Token[token];

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
      success: receipt.status !== "reverted",
      transactionHash: hash,
      receipt: formattedReceipt,
    };
  } catch (error) {
    console.error("Repay error:", error);
    return {
      success: false,
      error: error.message || "Unknown error during repay",
      details: error.details || {},
    };
  }
};

const listToken = async ({ chainId, tokenAddress }) => {
  try {
    const { publicClient, walletClient } = await initalizeClients({ chainId });
    const networkConfig = Object.values(NETWORK_CONFIGS).find(
      (config) => config.chainId === chainId
    );
    const contractAddress = networkConfig.contractAddresses.LendingPool;
    const account = privateKeyToAccount(process.env.PRIVATE_KEY);
    const chain = networkConfig.chain;
    try {
      const isListed = await publicClient.readContract({
        address: contractAddress,
        abi: lendingPoolABI,
        functionName: "tokenData",
        args: [tokenAddress],
      });
      console.log("Token data:", isListed);
    } catch (error) {
      // If we get an error, the token might not be listed yet
      console.log("Token might not be listed yet:", error.message);
    }

    // Read the contract owner to see if we have permission
    console.log("Checking contract ownership...");
    try {
      const owner = await publicClient.readContract({
        address: contractAddress,
        abi: lendingPoolABI,
        functionName: "owner",
      });
      console.log("Contract owner:", owner);
      console.log("Your address:", account.address);

      if (owner.toLowerCase() !== account.address.toLowerCase()) {
        console.warn(
          "Warning: Your address is not the contract owner. You might not have permission to list tokens."
        );
      }
    } catch (error) {
      console.error("Error checking contract ownership:", error.message);
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
          ].includes(item.name)
      );
      console.log(
        "Other relevant functions:",
        JSON.stringify(otherRelevantFunctions)
      );
    } catch (error) {
      console.error("Error accessing ABI:", error.message);
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
        address: contractAddress,
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
      console.error("Simulation failed:", error.message);
      console.error(
        "Error details:",
        error.cause ? error.cause.message : "No additional details"
      );

      // Return early if simulation fails
      return {
        success: false,
        error: "Transaction simulation failed: " + error.message,
        simulationError: error.cause ? error.cause.message : null,
      };
    }

    const txParams = {
      account,
      to: contractAddress,
      data,
      gas: gasLimit,
      gasPrice,
      nonce: BigInt(nonce),
      chain: chain,
    };

    console.log("Sending actual transaction...");
    const hash = await walletClient.sendTransaction(txParams);
    console.log("Transaction sent, hash:", hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Transaction status:", receipt.status);

    if (receipt.status === "reverted") {
      console.error("Transaction reverted despite successful simulation!");
      // Additional debug info
      try {
        const contractCode = await publicClient.getBytecode({
          address: contractAddress,
        });
        console.log("Contract exists:", !!contractCode);

        // Try with different gas limit
        console.log(
          "This might be a gas issue. Recommend trying with higher gas limit."
        );
      } catch (error) {
        console.error("Error getting additional debug info:", error.message);
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
      error: error.message || "Unknown error during token listing",
      details: error.details || {},
    };
  }
};

module.exports = {
  formatUnits,
  parseUnits,
  getWalletAddress: () => wallet?.address,
  approve: approveWithWagmi,
  deposit,
  getTokenBalance,
  checkAllowance,
  withdraw,
  borrow,
  repay,
  listToken,
};
