/**
 * Integration Service
 *
 * This service provides integration with blockchain networks using ethers.js
 * It handles transaction signing and other blockchain operations
 */

const { ethers } = require("ethers");
const mintABI = require("../../artifacts/MockToken.json");
const {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
} = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { celoAlfajores } = require("viem/chains");

// Cache provider and wallet instances
let provider;
let wallet;

const NETWORK_CONFIGS = {
  // rootstock
  rootstock: {
    chainId: 30,
    name: "Rootstock",
    network: "rootstock",
  },
  celoAlfajores: {
    chainId: 44787,
    name: "Alfajores",
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
 * Initialize the blockchain connection
 * @returns {Promise<boolean>} Success status
 */
const initBlockchain = async () => {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("Missing PRIVATE_KEY");
    provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    console.log("Account balance:", ethers.utils.formatEther(balance));
    return true;
  } catch (error) {
    console.error("Error initializing blockchain:", error);
    return false;
  }
};

/**
 * Sign and send a transaction
 * @param {Object} txParams Transaction parameters
 * @returns {Promise<Object>} Transaction result
 */
const signAndSendTransaction = async (txParams) => {
  try {
    if (!wallet) await initBlockchain();

    const balance = await provider.getBalance(wallet.address);
    const gasLimit = txParams.gasLimit || ethers.BigNumber.from(100000);
    const gasPrice = txParams.gasPrice || (await provider.getGasPrice());
    const value = txParams.value || ethers.BigNumber.from(0);

    const estimatedGasCost = gasLimit.mul(gasPrice);
    const totalCost = estimatedGasCost.add(value);

    if (balance.lt(totalCost)) {
      console.error(
        `Insufficient balance: ${ethers.utils.formatEther(
          balance
        )} < ${ethers.utils.formatEther(totalCost)}`
      );
      return {
        success: false,
        error: "Insufficient funds",
        details: {
          balance: ethers.utils.formatEther(balance),
          required: ethers.utils.formatEther(totalCost),
          missingAmount: ethers.utils.formatEther(totalCost.sub(balance)),
        },
      };
    }

    const tx = await wallet.sendTransaction(txParams);
    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    return {
      success: true,
      transactionHash: tx.hash,
      receipt,
    };
  } catch (error) {
    console.error("Error signing transaction:", error);

    // Improved error handling
    if (error.message && error.message.includes("insufficient funds")) {
      return {
        success: false,
        error: "Insufficient funds for transaction",
        details: {
          message: "Please fund your account with tokens",
          address: wallet.address,
        },
      };
    }

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Create a contract instance
 * @param {string} address Contract address
 * @param {Array} abi Contract ABI
 * @param {boolean} readOnly Whether to use provider (read-only) or wallet (read-write)
 * @returns {ethers.Contract} Contract instance
 */
const getContract = async (address, abi, readOnly = false) => {
  if (!provider) await initBlockchain();

  return new ethers.Contract(address, abi, readOnly ? provider : wallet);
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

/**
 * Approve token spending using wagmi
 * @param {Object} req Request object with contract details
 * @returns {Promise<Object>} Transaction result
 */
const approveWithWagmi = async () => {
  try {
    const account = privateKeyToAccount(process.env.PRIVATE_KEY);
    const publicClient = createPublicClient({
      chain: celoAlfajores,
      transport: http(process.env.RPC_URL),
    });
    const walletClient = createWalletClient({
      account,
      chain: celoAlfajores,
      transport: http(process.env.RPC_URL),
    });
    const chainId = await publicClient.getChainId();
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

    // Estimate total gas cost for all approvals
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
          nonce: BigInt(nonce) + BigInt(results.length), // Increment nonce for each transaction
          chain: celoAlfajores,
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
          chain: NETWORK_CONFIGS.celoAlfajores.name,
        },
      };
    }

    return {
      success: false,
      error: error.shortMessage || error.message,
      details: {
        code: error.code,
        parameters: error.metaMessages,
        chain: NETWORK_CONFIGS.celoAlfajores.name,
      },
    };
  }
};

module.exports = {
  initBlockchain,
  signAndSendTransaction,
  getContract,
  formatUnits,
  parseUnits,
  getWalletAddress: () => wallet?.address,
  approve: approveWithWagmi,
};
