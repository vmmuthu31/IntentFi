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

// get the balance of the account in a specific chain for the token mintoken abi
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
  return balance;
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

const deposit = async ({ chainId, token, amount }) => {
  const { publicClient, walletClient } = await initalizeClients({ chainId });
  const networkConfig = Object.values(NETWORK_CONFIGS).find(
    (config) => config.chainId === chainId
  );
  const chain = networkConfig.chain;
  const account = privateKeyToAccount(process.env.PRIVATE_KEY);
  const contractAddress = networkConfig.contractAddresses.LendingPool;
  const tokenAddress = networkConfig.contractAddresses.Token[token];
  console.log("contractAddress", contractAddress);
  console.log("tokenAddress", tokenAddress);
  console.log("amount", amount);

  const [gasPrice, nonce] = await Promise.all([
    publicClient.getGasPrice(),
    publicClient.getTransactionCount({
      address: account.address,
      blockTag: "pending",
    }),
  ]);

  const gasLimit = BigInt(100000);
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

  // Format the receipt to ensure all BigInt values are converted to strings
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
    success: true,
    transactionHash: hash,
    receipt: formattedReceipt,
  };
};

module.exports = {
  formatUnits,
  parseUnits,
  getWalletAddress: () => wallet?.address,
  approve: approveWithWagmi,
  deposit,
  getTokenBalance,
  checkAllowance,
};
