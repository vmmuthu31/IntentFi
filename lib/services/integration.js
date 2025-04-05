/**
 * Integration Service
 *
 * This service provides integration with blockchain networks using ethers.js
 * It handles transaction signing and other blockchain operations
 */

const { ethers } = require("ethers");
import MintTokenAbi from "../../artifacts/MockToken.json";
import LendingPoolAbi from "../../artifacts/LendingPool.json";
import PriceOracleAbi from "../../artifacts/PriceOracle.json";
// TODO: Use the correct ABI for the YieldFarm
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import YieldTokenAbi from "../../artifacts/YieldFarm.json";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import PlatformTokenAbi from "../../artifacts/Protocol.json";
// Cache provider and wallet instances
let provider;
let wallet;

const NETWORK_CONFIGS = {
  // Celo Alfajores Testnet
  44787: {
    chainId: 44787,
    name: "Alfajores",
    network: "celo-alfajores",
    rpcUrl:
      process.env.CELO_RPC_URL || "https://alfajores-forno.celo-testnet.org",
    nativeCurrency: {
      decimals: 18,
      name: "CELO",
      symbol: "CELO",
    },
    contractAddresses: {
      PriceOracle: "0x308b659c3b437cfb4f54573e9c3c03aceb8b5205",
      LendingPool: "0x884184a9afb1b8f44fad1c74a63b739a7c82801d",
      YieldFarm: "0xa2ae5cb0b0e23f710887be2676f1381fb9e4fe44",
      DeFIPlatform: "0x649f3f2f4ab598272f2796401968ed74cbea948c",
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
    // Using PRIVATE_KEY instead of NEXT_PUBLIC_PRIVATE_KEY for security
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("Missing PRIVATE_KEY");

    // Initialize provider with network config
    provider = new ethers.providers.JsonRpcProvider(
      process.env.RPC_URL // Changed from NEXT_PUBLIC_INFURA_URL
    );

    // Create wallet instance
    wallet = new ethers.Wallet(privateKey, provider);

    // Test connection by getting balance
    const balance = await provider.getBalance(wallet.address);
    console.log("Account balance:", ethers.utils.formatEther(balance));

    return true;
  } catch (error) {
    console.error("Error initializing blockchain:", error);
    return false;
  }
};

const getChainId = async () => {
  const chainId = await provider.getChainId();
  return chainId;
};

/**
 * Sign and send a transaction
 * @param {Object} txParams Transaction parameters
 * @returns {Promise<Object>} Transaction result
 */
const signAndSendTransaction = async (txParams) => {
  try {
    if (!wallet) await initBlockchain();

    // Check if user has enough balance for transaction
    const balance = await provider.getBalance(wallet.address);
    const gasLimit = txParams.gasLimit || ethers.BigNumber.from(100000); // Default gas limit
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
const approveWithWagmi = async (req) => {
  try {
    const { contractAddress, spenderAddress, allowanceAmount } = req.body;

    console.log("Approving transaction for:", contractAddress);
    console.log("Spender address:", spenderAddress);
    console.log("Allowance amount:", allowanceAmount);

    const { createPublicClient, createWalletClient, http, encodeFunctionData } =
      await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");
    const { celoAlfajores } = await import("viem/chains");

    // Using PRIVATE_KEY instead of NEXT_PUBLIC_PRIVATE_KEY for security
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("Missing PRIVATE_KEY");

    const account = privateKeyToAccount(privateKey);
    console.log("Account address:", account.address);

    const publicClient = createPublicClient({
      chain: celoAlfajores,
      transport: http(NETWORK_CONFIGS[44787].rpcUrl),
    });

    const chainId = await getChainId();
    const networkConfig = NETWORK_CONFIGS[chainId];
    const walletClient = createWalletClient({
      account,
      chain: celoAlfajores,
      transport: http(networkConfig.rpcUrl),
    });

    // Get dynamic transaction parameters
    const [gasPrice, nonce] = await Promise.all([
      publicClient.getGasPrice(),
      publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      }),
    ]);
    console.log(`Gas Price: ${gasPrice} wei`);
    console.log(`Nonce: ${nonce}`);

    // Encode approval data
    const data = encodeFunctionData({
      abi: MintTokenAbi,
      functionName: "approve",
      args: [
        spenderAddress,
        BigInt(
          ethers.utils.parseUnits(allowanceAmount.toString(), 18).toString()
        ),
      ],
    });

    // Reduced gas limit from 500000 to 100000
    const gasLimit = BigInt(100000);

    // Check if user has enough balance for transaction
    const balance = await publicClient.getBalance({ address: account.address });
    const estimatedGasCost = gasLimit * gasPrice;

    if (balance < estimatedGasCost) {
      console.error(`Insufficient balance: ${balance} < ${estimatedGasCost}`);
      return {
        success: false,
        error: "Insufficient funds",
        details: {
          balance: balance.toString(),
          required: estimatedGasCost.toString(),
          missingAmount: (estimatedGasCost - balance).toString(),
          message: "Please fund your account with testnet CELO",
          address: account.address,
          faucetUrl: "https://faucet.celo.org/alfajores",
        },
      };
    }

    // Prepare transaction parameters
    const txParams = {
      account,
      to: contractAddress,
      data,
      gas: gasLimit,
      gasPrice,
      nonce,
      chain: celoAlfajores,
    };

    console.log(
      "Sending transaction with params:",
      JSON.stringify(txParams, (_, v) =>
        typeof v === "bigint" ? v.toString() : v
      )
    );

    // Send transaction
    const hash = await walletClient.sendTransaction(txParams);
    console.log("Transaction hash:", hash);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Transaction confirmed:", receipt);

    return {
      success: true,
      transactionHash: hash,
      receipt: {
        blockHash: receipt.blockHash,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: Number(receipt.gasUsed),
        status: receipt.status,
      },
    };
  } catch (error) {
    console.error("Transaction Error:", {
      message: error.message,
      details: error.details,
      stack: error.stack,
    });

    const chainId = await getChainId();
    const networkConfig = NETWORK_CONFIGS[chainId];
    // Improved error handling
    if (error.message && error.message.includes("insufficient funds")) {
      return {
        success: false,
        error: "Insufficient funds for transaction",
        details: {
          message:
            "Please fund your account with testnet CELO using the faucet",
          faucetUrl: "https://faucet.celo.org/alfajores",
          chain: networkConfig.name,
        },
      };
    }

    return {
      success: false,
      error: error.shortMessage || error.message,
      details: {
        code: error.code,
        parameters: error.metaMessages,
        chain: networkConfig.name,
      },
    };
  }
};

/**
 * Approve token spending
 * @param {Object} req Request object with contract details
 * @returns {Promise<Object>} Transaction result
 */
const approve = async (req) => {
  try {
    const { contractAddress, spenderAddress, allowanceAmount } = req.body;

    if (!wallet) await initBlockchain();

    console.log("Approving transaction for:", contractAddress);
    console.log("Spender address:", spenderAddress);
    console.log("Allowance amount:", allowanceAmount);

    // Create token contract instance
    const tokenContract = new ethers.Contract(
      contractAddress,
      MintTokenAbi,
      wallet
    );

    // Parse allowance amount to wei
    const parsedAmount = ethers.utils.parseUnits(
      allowanceAmount.toString(),
      18
    );

    // Estimate gas for the approval transaction
    const estimatedGas = await tokenContract.estimateGas.approve(
      spenderAddress,
      parsedAmount
    );
    const gasLimit = estimatedGas
      .mul(ethers.BigNumber.from(120))
      .div(ethers.BigNumber.from(100)); // Add 20% buffer

    // Send approval transaction
    const tx = await tokenContract.approve(spenderAddress, parsedAmount, {
      gasLimit,
    });

    console.log("Approval transaction sent:", tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("Approval transaction confirmed:", receipt);

    return {
      success: true,
      transactionHash: tx.hash,
      receipt: {
        blockHash: receipt.blockHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
      },
    };
  } catch (error) {
    console.error("Approval Error:", {
      message: error.message,
      details: error.data,
      stack: error.stack,
    });

    if (error.message && error.message.includes("insufficient funds")) {
      return {
        success: false,
        error: "Insufficient funds for transaction",
        details: {
          message: "Please fund your account with tokens",
          address: wallet?.address,
        },
      };
    }

    return {
      success: false,
      error: error.message,
      details: {
        code: error.code,
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
  approve,
  approveWithWagmi,
  getChainId,
};
