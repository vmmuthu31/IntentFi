/**
 * Integration Service
 *
 * This service provides integration with blockchain networks using ethers.js
 * It handles transaction signing and other blockchain operations
 */

const { ethers } = require("ethers");

// Cache provider and wallet instances
let provider;
let wallet;

// Add the ERC20 ABI at the top of the file
const erc20ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

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
 * Celo network configuration
 */
const CELO_CONFIG = {
  chainId: 44787,
  name: "Alfajores",
  network: "celo-alfajores",
  rpcUrl: process.env.RPC_URL, // Changed from NEXT_PUBLIC_INFURA_URL
  nativeCurrency: {
    decimals: 18,
    name: "CELO",
    symbol: "CELO",
  },
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
      transport: http(CELO_CONFIG.rpcUrl),
    });

    const walletClient = createWalletClient({
      account,
      chain: celoAlfajores,
      transport: http(CELO_CONFIG.rpcUrl),
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
      abi: erc20ABI,
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

    // Improved error handling
    if (error.message && error.message.includes("insufficient funds")) {
      return {
        success: false,
        error: "Insufficient funds for transaction",
        details: {
          message:
            "Please fund your account with testnet CELO using the faucet",
          faucetUrl: "https://faucet.celo.org/alfajores",
          chain: CELO_CONFIG.name,
        },
      };
    }

    return {
      success: false,
      error: error.shortMessage || error.message,
      details: {
        code: error.code,
        parameters: error.metaMessages,
        chain: CELO_CONFIG.name,
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
