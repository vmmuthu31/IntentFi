/**
 * Blockchain Service
 *
 * This service handles interactions with blockchain networks and smart contracts.
 */

import { encodeFunctionData } from "viem";
import { toSafeSmartAccount } from "permissionless/accounts";
import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoAlfajores } from "viem/chains";
import {
  createPimlicoClient,
  PimlicoClient,
} from "permissionless/clients/pimlico";
import { entryPoint07Address, SmartAccount } from "viem/account-abstraction";
import { createSmartAccountClient, SmartAccountClient } from "permissionless";

// ABI imports
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

const lendingABI = [
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "borrow",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// Create public client
const publicClient = createPublicClient({
  chain: celoAlfajores,
  transport: http(process.env.NEXT_PUBLIC_INFURA_URL || ""),
});

// Define clients
let pimlicoClient: PimlicoClient;
let smartAccountClient: SmartAccountClient;
let account: SmartAccount | null = null;

// Initialize clients function
export const initClients = async () => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
    if (!apiKey) throw new Error("Missing PIMLICO_API_KEY");

    const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;
    if (!privateKey) throw new Error("Missing PRIVATE_KEY");

    // Create Pimlico client
    const pimlicoUrl = `https://api.pimlico.io/v2/44787/rpc?apikey=${apiKey}`;
    pimlicoClient = createPimlicoClient({
      transport: http(pimlicoUrl),
      entryPoint: { address: entryPoint07Address, version: "0.7" },
    });

    console.log("Pimlico client created:", pimlicoClient);

    // Create smart account

    account = await toSafeSmartAccount({
      client: publicClient,
      owners: [privateKeyToAccount(privateKey as `0x${string}`)],
      entryPoint: { address: entryPoint07Address, version: "0.7" },
      version: "1.4.1",
    });

    console.log("Smart account created:", account);

    // Create smart account client
    smartAccountClient = createSmartAccountClient({
      account,
      chain: celoAlfajores,
      bundlerTransport: http(pimlicoUrl),
    });

    console.log(
      "Blockchain clients initialized with account:",
      account.address
    );
    return true;
  } catch (error) {
    console.error("Error initializing clients:", error);
    return false;
  }
};

// Approve function
export const approve = async (req: {
  body: {
    contractAddress: string;
    spenderAddress: string;
    allowanceAmount: string;
  };
}) => {
  try {
    const { contractAddress, spenderAddress, allowanceAmount } = req.body;
    console.log("Approve request:", req.body);

    if (!contractAddress || !spenderAddress || !allowanceAmount) {
      throw new Error("Missing required parameters");
    }

    // Initialize clients if needed
    if (!account) {
      console.log("Initializing clients");
      await initClients();
    }

    console.log("Using smart account:", account?.address);
    console.log("Sending transaction to:", contractAddress);

    if (!smartAccountClient) {
      throw new Error("Smart account client not initialized");
    }

    if (!account) {
      throw new Error("Account not initialized");
    }

    smartAccountClient = createSmartAccountClient({
      account,
      chain: celoAlfajores,
      bundlerTransport: http(
        `https://api.pimlico.io/v2/44787/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`
      ),
    });

    // Send transaction
    const txHash = await smartAccountClient.sendTransaction({
      account,
      chain: celoAlfajores,
      to: contractAddress as `0x${string}`,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: erc20ABI,
        functionName: "approve",
        args: [spenderAddress, allowanceAmount],
      }),
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    return {
      transactionHash: txHash,
      receipt,
      smartAccountAddress: account?.address,
    };
  } catch (error) {
    console.error("Error in approve:", error);
    throw error;
  }
};

// SBT mint function
export const sbtmint = async () => {
  try {
    // Initialize clients if needed
    if (!account) {
      await initClients();
    }

    // Contract and API configuration
    const contractAddress = "0xb2CfbF986e91beBF31f31CCf41EDa83384c3e7d5";
    const spenderAddress = "0x884184a9aFb1B8f44fAd1C74a63B739A7c82801D";
    const allowanceAmount = "100000";

    // Send transaction to approve tokens
    const txHash = await smartAccountClient.sendTransaction({
      account,
      chain: celoAlfajores,
      to: contractAddress as `0x${string}`,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: erc20ABI,
        functionName: "approve",
        args: [spenderAddress, allowanceAmount],
      }),
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    return {
      transactionHash: txHash,
      receipt,
      smartAccountAddress: account?.address,
    };
  } catch (error) {
    console.error("Error in sbtmint:", error);
    throw error;
  }
};

// Get allowance function
export const getAllowance = async (req: {
  body: {
    contractAddress: string;
    ownerAddress: string;
    spenderAddress: string;
  };
}) => {
  try {
    const { contractAddress, ownerAddress, spenderAddress } = req.body;
    console.log("Get allowance request:", req.body);

    if (!contractAddress || !ownerAddress || !spenderAddress) {
      throw new Error("Missing required parameters");
    }

    const allowance = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: erc20ABI,
      functionName: "allowance",
      args: [ownerAddress, spenderAddress],
    });

    return {
      allowance: allowance?.toString() || "0",
    };
  } catch (error) {
    console.error("Error in getAllowance:", error);
    throw error;
  }
};

// Deposit function
export const deposit = async (req: {
  body: {
    contractAddress: string;
    tokenAddress: string;
    amount: string;
  };
}) => {
  try {
    const { contractAddress, tokenAddress, amount } = req.body;
    console.log("Deposit request:", req.body);

    if (!contractAddress || !tokenAddress || !amount) {
      throw new Error("Missing required parameters");
    }

    // Initialize clients if needed
    if (!account) {
      await initClients();
    }

    const txHash = await smartAccountClient.sendTransaction({
      account,
      chain: celoAlfajores,
      to: contractAddress as `0x${string}`,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: lendingABI,
        functionName: "deposit",
        args: [tokenAddress, amount],
      }),
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    return {
      transactionHash: txHash,
      receipt,
      smartAccountAddress: account?.address,
    };
  } catch (error) {
    console.error("Error in deposit:", error);
    throw error;
  }
};

// Withdraw function
export const withdraw = async (req: {
  body: {
    contractAddress: string;
    tokenAddress: string;
    amount: string;
  };
}) => {
  try {
    const { contractAddress, tokenAddress, amount } = req.body;
    console.log("Withdraw request:", req.body);

    if (!contractAddress || !tokenAddress || !amount) {
      throw new Error("Missing required parameters");
    }

    // Initialize clients if needed
    if (!account) {
      await initClients();
    }

    const txHash = await smartAccountClient.sendTransaction({
      account,
      chain: celoAlfajores,
      to: contractAddress as `0x${string}`,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: lendingABI,
        functionName: "withdraw",
        args: [tokenAddress, amount],
      }),
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    return {
      transactionHash: txHash,
      receipt,
      smartAccountAddress: account?.address,
    };
  } catch (error) {
    console.error("Error in withdraw:", error);
    throw error;
  }
};

// Borrow function
export const borrow = async (req: {
  body: {
    contractAddress: string;
    tokenAddress: string;
    amount: string;
  };
}) => {
  try {
    const { contractAddress, tokenAddress, amount } = req.body;
    console.log("Borrow request:", req.body);

    if (!contractAddress || !tokenAddress || !amount) {
      throw new Error("Missing required parameters");
    }

    // Initialize clients if needed
    if (!account) {
      await initClients();
    }

    const txHash = await smartAccountClient.sendTransaction({
      account,
      chain: celoAlfajores,
      to: contractAddress as `0x${string}`,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: lendingABI,
        functionName: "borrow",
        args: [tokenAddress, amount],
      }),
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    return {
      transactionHash: txHash,
      receipt,
      smartAccountAddress: account?.address,
    };
  } catch (error) {
    console.error("Error in borrow:", error);
    throw error;
  }
};

// List smart accounts function
export const listSmartAccounts = async () => {
  try {
    // Initialize clients if needed
    if (!account) {
      await initClients();
    }

    return [
      {
        address:
          account?.address || "0x0000000000000000000000000000000000000000",
        isDeployed: true,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      },
    ];
  } catch (error) {
    console.error("Error listing smart accounts:", error);
    throw error;
  }
};

// Function to check if a smart account is deployed
export async function isSmartAccountDeployed(
  address: string
): Promise<boolean> {
  try {
    const code = await publicClient.getBytecode({
      address: address as `0x${string}`,
    });
    return code !== undefined && code !== "0x";
  } catch (error) {
    console.error("Error checking if smart account is deployed:", error);
    return false;
  }
}
