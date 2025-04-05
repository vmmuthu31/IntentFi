/**
 * Integration Service
 *
 * This service provides integration with blockchain networks using ethers.js
 * It handles transaction signing and other blockchain operations
 */

import { ethers, BigNumber } from "ethers";

import MintTokenAbi from "../../artifacts/MockToken.json";
import LendingPoolAbi from "../../artifacts/LendingPool.json";
import PriceOracleAbi from "../../artifacts/PriceOracle.json";
// TODO: Use the correct ABI for the YieldFarm
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import YieldTokenAbi from "../../artifacts/YieldFarm.json";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import PlatformTokenAbi from "../../artifacts/Protocol.json";

// Type definitions
interface NetworkConfig {
  chainId: number;
  name: string;
  network: string;
  rpcUrl: string;
  nativeCurrency: {
    decimals: number;
    name: string;
    symbol: string;
  };
  contractAddresses: {
    [key: string]: string | { [key: string]: string };
  };
}

interface DepositRequest {
  body: {
    contractAddress: string;
    token: string;
    amount: string | number;
  };
}

interface WithdrawRequest {
  body: {
    contractAddress: string;
    token: string;
    amount: string | number;
  };
}

interface BorrowRequest {
  body: {
    contractAddress: string;
    token: string;
    amount: string | number;
  };
}

interface RepayRequest {
  body: {
    contractAddress: string;
    token: string;
    amount: string | number;
  };
}

interface TransactionParams {
  to?: string;
  from?: string;
  nonce?: number;
  gasLimit?: BigNumber;
  gasPrice?: BigNumber;
  data?: string;
  value?: BigNumber;
  chainId?: number;
}

interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  receipt?: ethers.providers.TransactionReceipt;
  error?: string;
  details?: {
    balance?: string;
    required?: string;
    missingAmount?: string;
    message?: string;
    address?: string;
    faucetUrl?: string;
    code?: string;
    parameters?: Record<string, unknown>;
    chain?: string;
  };
}

interface ApproveRequest {
  body: {
    contractAddress: string;
    spenderAddress: string;
    allowanceAmount: string | number;
  };
}

/**
 * Network configurations
 */
const NETWORK_CONFIGS: Record<number, NetworkConfig> = {
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
  // Ethereum Mainnet
  1: {
    chainId: 1,
    name: "Ethereum Mainnet",
    network: "ethereum-mainnet",
    rpcUrl:
      process.env.ETH_RPC_URL || "https://mainnet.infura.io/v3/your-infura-key",
    nativeCurrency: {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
    },
    contractAddresses: {
      // Add actual contract addresses for Ethereum mainnet
      PriceOracle: "",
      LendingPool: "",
      YieldFarm: "",
      DeFIPlatform: "",
      Token: {
        USDC: "",
        ETH: "",
      },
    },
  },
  // Add more networks as needed
};

/**
 * Get network configuration based on chainId
 * @param {number} chainId - Chain ID of the network
 * @returns {NetworkConfig} Network configuration
 */
const getConfig = (chainId?: number): NetworkConfig => {
  // Default to Celo Alfajores if no chainId provided
  const defaultChainId = 44787;
  const targetChainId = chainId || defaultChainId;

  const config = NETWORK_CONFIGS[targetChainId];
  if (!config) {
    throw new Error(
      `Network configuration not found for chain ID: ${targetChainId}`
    );
  }

  return config;
};

// Cache provider and wallet instances
let provider: ethers.providers.JsonRpcProvider | undefined;
let wallet: ethers.Wallet | undefined;
let currentChainId: number | undefined;

/**
 * Initialize the blockchain connection
 * @param {number} chainId - Chain ID of the network to connect to
 * @returns {Promise<boolean>} Success status
 */
const initBlockchain = async (chainId?: number): Promise<boolean> => {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("Missing PRIVATE_KEY");

    // Get network config based on chainId
    const networkConfig = getConfig(chainId);
    currentChainId = networkConfig.chainId;

    // Initialize provider with network config
    provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);

    // Create wallet instance
    wallet = new ethers.Wallet(privateKey, provider);

    // Test connection by getting balance
    const balance = await provider.getBalance(wallet.address);
    console.log(
      `Account balance on ${networkConfig.name}:`,
      ethers.utils.formatEther(balance)
    );

    return true;
  } catch (error) {
    console.error("Error initializing blockchain:", error);
    return false;
  }
};

/**
 * Sign and send a transaction
 * @param {TransactionParams} txParams Transaction parameters
 * @returns {Promise<TransactionResult>} Transaction result
 */
const signAndSendTransaction = async (
  txParams: TransactionParams
): Promise<TransactionResult> => {
  try {
    // Initialize blockchain if not already initialized
    if (!wallet) await initBlockchain(txParams.chainId);
    if (!wallet || !provider) {
      throw new Error("Wallet or provider not initialized");
    }

    // Use provided chainId or current chainId
    const chainId = txParams.chainId || currentChainId;
    if (!chainId) {
      throw new Error("Chain ID not specified");
    }

    // Get network config for the chain
    const networkConfig = getConfig(chainId);

    // Add chainId to transaction parameters
    txParams.chainId = chainId;

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
          chain: networkConfig.name,
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error signing transaction:", errorMessage);

    // Get the network config for error details
    const chainId = txParams.chainId || currentChainId;
    const networkConfig = chainId ? getConfig(chainId) : undefined;

    // Improved error handling
    if (errorMessage.includes("insufficient funds")) {
      return {
        success: false,
        error: "Insufficient funds for transaction",
        details: {
          message: `Please fund your account with ${
            networkConfig?.nativeCurrency.symbol || "native"
          } tokens`,
          address: wallet?.address,
          chain: networkConfig?.name,
        },
      };
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Create a contract instance
 * @param {string} address Contract address
 * @param {ethers.ContractInterface} abi Contract ABI
 * @param {boolean} readOnly Whether to use provider (read-only) or wallet (read-write)
 * @param {number} chainId Chain ID for the network to use
 * @returns {Promise<ethers.Contract>} Contract instance
 */
const getContract = async (
  address: string,
  abi: ethers.ContractInterface,
  readOnly = false,
  chainId?: number
): Promise<ethers.Contract> => {
  // Initialize blockchain if not already initialized, using specified chainId
  if (!provider || chainId !== currentChainId) await initBlockchain(chainId);

  if (!provider || (!readOnly && !wallet)) {
    throw new Error("Provider or wallet not initialized");
  }

  return new ethers.Contract(address, abi, readOnly ? provider : wallet);
};

/**
 * Format units to human-readable form
 * @param {string|BigNumber} value Value to format
 * @param {number} decimals Number of decimals
 * @returns {string} Formatted value
 */
const formatUnits = (value: string | BigNumber, decimals = 18): string => {
  return ethers.utils.formatUnits(value, decimals);
};

/**
 * Parse units from human-readable form to wei
 * @param {string} value Value to parse
 * @param {number} decimals Number of decimals
 * @returns {BigNumber} Parsed value
 */
const parseUnits = (value: string | number, decimals = 18): BigNumber => {
  return ethers.utils.parseUnits(value.toString(), decimals);
};

const approve = async (
  req: ApproveRequest,
  chainId?: number
): Promise<TransactionResult> => {
  const { contractAddress, spenderAddress, allowanceAmount } = req.body;
  const contract = await getContract(
    contractAddress,
    MintTokenAbi,
    false,
    chainId
  );
  const tx = await contract.approve(spenderAddress, allowanceAmount);
  return signAndSendTransaction(tx);
};

const deposit = async (
  req: DepositRequest,
  chainId?: number
): Promise<TransactionResult> => {
  const { contractAddress, token, amount } = req.body;
  const contract = await getContract(
    contractAddress,
    LendingPoolAbi,
    false,
    chainId
  );
  const tx = await contract.deposit(token, amount);
  return signAndSendTransaction(tx);
};

const withdraw = async (
  req: WithdrawRequest,
  chainId?: number
): Promise<TransactionResult> => {
  const { contractAddress, token, amount } = req.body;
  const contract = await getContract(
    contractAddress,
    LendingPoolAbi,
    false,
    chainId
  );
  const tx = await contract.withdraw(token, amount);
  return signAndSendTransaction(tx);
};

const borrow = async (
  req: BorrowRequest,
  chainId?: number
): Promise<TransactionResult> => {
  const { contractAddress, token, amount } = req.body;
  const contract = await getContract(
    contractAddress,
    LendingPoolAbi,
    false,
    chainId
  );

  const tx = await contract.borrow(token, amount);
  return signAndSendTransaction(tx);
};

const repay = async (
  req: RepayRequest,
  chainId?: number
): Promise<TransactionResult> => {
  const { contractAddress, token, amount } = req.body;
  const contract = await getContract(
    contractAddress,
    LendingPoolAbi,
    false,
    chainId
  );
  const tx = await contract.repay(token, amount);
  return signAndSendTransaction(tx);
};

const getTokenPrice = async (
  token: string,
  chainId?: number,
  contractAddress?: string
): Promise<TransactionResult> => {
  const contract = await getContract(
    contractAddress as string,
    PriceOracleAbi,
    true,
    chainId
  );

  console.log("contract", contract);
  const price = await contract.getTokenPrice(token);
  return price;
};

export {
  initBlockchain,
  signAndSendTransaction,
  getContract,
  formatUnits,
  parseUnits,
  approve,
  getConfig,
  NETWORK_CONFIGS,
  deposit,
  withdraw,
  borrow,
  repay,
  getTokenPrice,
};
