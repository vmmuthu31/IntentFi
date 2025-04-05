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
  entryPoint07Address,
  EntryPointVersion,
} from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { erc7579Actions } from "permissionless/actions/erc7579";

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
let publicClient = createPublicClient({
  chain: celoAlfajores,
  transport: http(process.env.NEXT_PUBLIC_INFURA_URL || ""),
});

// State management
let isInitializing = false;
let isDeploying = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let account: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let smartAccountClient: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pimlicoClient: any = null;

// Initialize clients function
export const initClients = async () => {
  try {
    // Prevent multiple concurrent initialization
    if (isInitializing) {
      console.log("Initialization already in progress, waiting...");
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!isInitializing) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 500);
      });
      return !!account;
    }

    isInitializing = true;

    const apiKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
    if (!apiKey) {
      console.error("Missing PIMLICO_API_KEY");
      isInitializing = false;
      return false;
    }

    const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;
    if (!privateKey) {
      console.error("Missing PRIVATE_KEY");
      isInitializing = false;
      return false;
    }

    // Update public client for reading blockchain state
    publicClient = createPublicClient({
      chain: celoAlfajores,
      transport: http(process.env.NEXT_PUBLIC_INFURA_URL || ""),
    });

    // Create Pimlico client for bundler services
    const pimlicoUrl = `https://api.pimlico.io/v2/44787/rpc?apikey=${apiKey}`;
    console.log("Using Pimlico URL:", pimlicoUrl);

    // Create Pimlico paymaster client
    pimlicoClient = createPimlicoClient({
      chain: celoAlfajores,
      transport: http(pimlicoUrl),
      entryPoint: {
        address: entryPoint07Address,
        version: "0.7" as EntryPointVersion,
      },
    });

    // Create smart account with owner derived from private key
    const owner = privateKeyToAccount(privateKey as `0x${string}`);
    console.log("Owner address:", owner.address);

    // Create the safe account (this doesn't deploy it)
    account = await toSafeSmartAccount({
      client: publicClient,
      owners: [owner],
      version: "1.4.1",
      entryPoint: {
        address: entryPoint07Address,
        version: "0.7",
      },
      safe4337ModuleAddress: "0x7579EE8307284F293B1927136486880611F20002",
      erc7579LaunchpadAddress: "0x7579011aB74c46090561ea277Ba79D510c6C00ff",
      attesters: ["0x000000333034E9f539ce08819E12c1b8Cb29084d"], // Rhinestone attesters
      attestersThreshold: 1,
    });

    console.log("Smart account created:", account.address);

    // Check if the account is already deployed
    const isDeployed = await account.isDeployed();
    console.log("Smart account is deployed:", isDeployed);

    // Create smart account client with the appropriate bundler and paymaster
    smartAccountClient = createSmartAccountClient({
      account: account,
      chain: celoAlfajores,
      bundlerTransport: http(pimlicoUrl),
      paymaster: pimlicoClient,
      userOperation: {
        estimateFeesPerGas: async () => {
          if (pimlicoClient) {
            // Get gas price from paymaster or use a default
            const gasPriceResponse =
              await pimlicoClient.getUserOperationGasPrice();
            // For Celo, maxFeePerGas must equal maxPriorityFeePerGas
            const gasPrice = gasPriceResponse.fast.maxFeePerGas;
            return {
              maxFeePerGas: gasPrice,
              maxPriorityFeePerGas: gasPrice, // Same as maxFeePerGas for Celo
            };
          }
          // Fallback to static values
          const gasPrice = BigInt(3000000000); // 3 Gwei
          return {
            maxFeePerGas: gasPrice,
            maxPriorityFeePerGas: gasPrice,
          };
        },
      },
    }).extend(erc7579Actions());

    // If the account is not deployed, try to deploy it
    if (!isDeployed) {
      console.log("Smart account is not deployed, attempting deployment...");
      try {
        const success = await deploySmartAccount();
        if (success) {
          console.log("Smart account deployed successfully!");
        } else {
          console.error("Failed to deploy smart account");
        }
      } catch (error) {
        console.error("Error deploying smart account:", error);
      }
    }

    console.log("Blockchain clients initialized");
    isInitializing = false;
    return true;
  } catch (error) {
    console.error("Error initializing clients:", error);
    isInitializing = false;
    return false;
  }
};

// Function to deploy the smart account
export const deploySmartAccount = async () => {
  try {
    if (isDeploying) {
      console.log("Deployment already in progress, waiting...");
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!isDeploying) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 500);
      });

      const isDeployed = await account?.isDeployed();
      return !!isDeployed;
    }

    isDeploying = true;

    if (!account) {
      console.log("No account to deploy, initializing first...");
      await initClients();
      if (!account) {
        console.error("Failed to initialize account for deployment");
        isDeploying = false;
        return false;
      }
    }

    console.log("Checking if account is already deployed...");
    const alreadyDeployed = await account.isDeployed();
    if (alreadyDeployed) {
      console.log("Account is already deployed:", account.address);
      isDeploying = false;
      return true;
    }

    console.log("Deploying account via UserOperation...");

    // Get the minimum deployment funds required from Pimlico
    const apiKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;
    if (!apiKey) {
      console.error("Missing PIMLICO_API_KEY for deployment");
      isDeploying = false;
      return false;
    }

    // Try direct deployment with initCode
    try {
      console.log("Account address:", account.address);

      // Set gas price - must be identical for maxFeePerGas and maxPriorityFeePerGas on Celo
      const deploymentGasPrice = BigInt(50000000000); // 50 Gwei

      // Send the deployment transaction with a lot of gas to ensure it gets included
      const deployHash = await smartAccountClient.sendTransaction({
        to: account.address,
        value: BigInt(0),
        data: "0x",
        maxFeePerGas: deploymentGasPrice,
        maxPriorityFeePerGas: deploymentGasPrice, // Same as maxFeePerGas for Celo
      });

      console.log("Deployment transaction hash:", deployHash);

      // Wait for the transaction receipt with a long timeout
      console.log("Waiting for deployment transaction receipt...");
      try {
        console.log("Waiting up to 3 minutes for receipt...");
        const txReceipt = await publicClient.waitForTransactionReceipt({
          hash: deployHash,
          timeout: 180000, // 3 minute timeout
        });
        console.log(
          "Deployment transaction receipt:",
          JSON.stringify(txReceipt)
        );
      } catch (waitError) {
        console.log(
          `Receipt wait error: ${
            waitError instanceof Error ? waitError.message : "Unknown error"
          }`
        );
        console.log("Continuing without receipt confirmation...");
      }

      // Add long delay to ensure deployment completes even if receipt isn't returned
      console.log("Waiting 30 seconds for deployment to finalize...");
      await new Promise((resolve) => setTimeout(resolve, 30000)); // 30 seconds

      // Keep checking deployment status
      let deploymentConfirmed = false;
      let attempts = 0;

      while (!deploymentConfirmed && attempts < 5) {
        attempts++;
        console.log(`Deployment verify attempt ${attempts}...`);

        try {
          const isNowDeployed = await account.isDeployed();
          if (isNowDeployed) {
            deploymentConfirmed = true;
            console.log("Account successfully deployed!");
            break;
          } else {
            console.log("Account still not deployed, waiting...");
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        } catch (error) {
          console.error("Error checking deployment status:", error);
        }
      }

      // Make a final check
      const finalDeploymentStatus = await account.isDeployed();
      console.log("Final deployment status:", finalDeploymentStatus);

      isDeploying = false;
      return finalDeploymentStatus;
    } catch (error) {
      console.error("Error in deployment transaction:", error);
      isDeploying = false;
      return false;
    }
  } catch (error) {
    console.error("Unexpected error in deploySmartAccount:", error);
    isDeploying = false;
    return false;
  }
};

// Helper function to send transactions
async function sendSmartAccountTransaction(
  to: string,
  data: string,
  value: bigint = BigInt(0)
) {
  // Make sure account is initialized and deployed
  if (!account || !smartAccountClient) {
    console.log("Account or client not initialized, initializing...");
    await initClients();
    if (!account || !smartAccountClient) {
      throw new Error("Failed to initialize account or client");
    }
  }

  // Check deployment status
  const isDeployed = await account.isDeployed();
  console.log("Is account deployed before transaction:", isDeployed);

  // Try deployment a maximum of 2 times before failing
  let deploymentAttempts = 0;
  const maxDeploymentAttempts = 2;

  while (!isDeployed && deploymentAttempts < maxDeploymentAttempts) {
    deploymentAttempts++;
    console.log(
      `Deployment attempt ${deploymentAttempts}/${maxDeploymentAttempts}...`
    );

    console.log("Account not deployed, deploying...");
    const deploySuccess = await deploySmartAccount();

    if (deploySuccess) {
      console.log(
        "Account successfully deployed on attempt",
        deploymentAttempts
      );
      break;
    } else {
      console.log(`Deployment attempt ${deploymentAttempts} failed`);

      if (deploymentAttempts >= maxDeploymentAttempts) {
        // If we're using the Safe account implementation, we can try a fallback approach
        // where we skip the deployment check for this transaction
        if (
          account.address &&
          typeof account.signUserOperation === "function"
        ) {
          console.log(
            "WARNING: Using fallback transaction method without deployment"
          );

          // Force transaction without deployment verification
          break;
        } else {
          throw new Error("Failed to deploy account after multiple attempts");
        }
      }

      // Wait before trying again
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  try {
    // Get gas price
    const gasPrice = BigInt(3000000000); // 3 Gwei

    // Set transaction parameters with identical gas price values for Celo
    // Celo doesn't support EIP-1559 fee model, so both values must be equal
    const transactionParams = {
      to: to as `0x${string}`,
      value,
      data: data as `0x${string}`,
      maxFeePerGas: gasPrice,
      maxPriorityFeePerGas: gasPrice, // Same as maxFeePerGas for Celo
    };

    console.log(
      "Sending transaction to:",
      to,
      "with gas price:",
      gasPrice.toString()
    );

    // Attempt to send the transaction with paymaster sponsorship
    let txHash;
    try {
      txHash = await smartAccountClient.sendTransaction(transactionParams);
    } catch (err) {
      // If we get error about factory/factoryData for already deployed accounts
      if (
        err instanceof Error &&
        err.message.includes("Smart Account has already been deployed") &&
        err.message.includes("Remove the following properties")
      ) {
        console.log(
          "Handling 'already deployed' error by recreating the account instance"
        );

        // Force account to refresh its deployment status
        if ("prepareForDeployment" in account) {
          // Mark account as deployed directly if it has the method
          console.log("Setting account as deployed");
          account.isDeployed = async () => true;
        }

        // Retry without factory data
        console.log("Retrying transaction without factory data");
        txHash = await smartAccountClient.sendTransaction(transactionParams);
      } else if (
        err instanceof Error &&
        err.message.includes("Smart Account does not have sufficient funds")
      ) {
        // If we get insufficient funds error, try with higher gas price
        console.log(
          "Insufficient funds error, using paymaster to sponsor gas..."
        );

        // Try with higher gas price (but still identical values)
        const higherGasPrice = BigInt(5000000000); // 5 Gwei
        const newParams = {
          ...transactionParams,
          maxFeePerGas: higherGasPrice,
          maxPriorityFeePerGas: higherGasPrice,
        };

        console.log(
          "Retrying with paymaster sponsorship and higher gas:",
          higherGasPrice.toString()
        );
        txHash = await smartAccountClient.sendTransaction(newParams);
      } else {
        // Re-throw any other errors
        throw err;
      }
    }

    console.log("Transaction hash:", txHash);
    return txHash;
  } catch (error) {
    console.error("Error sending transaction:", error);
    throw error;
  }
}

// Approve function
export const approve = async (req: {
  body: {
    contractAddress: string;
    spenderAddress: string;
    allowanceAmount: string;
    forceDeployed?: boolean;
  };
}) => {
  try {
    const { contractAddress, spenderAddress, allowanceAmount, forceDeployed } =
      req.body;
    console.log("Approve request:", req.body);

    if (!contractAddress || !spenderAddress || !allowanceAmount) {
      throw new Error("Missing required parameters");
    }

    // Initialize clients if needed
    if (!account || !smartAccountClient) {
      console.log("Initializing clients");
      await initClients();
    }

    if (!account) {
      throw new Error("Account not initialized");
    }

    console.log("Using smart account:", account.address);

    // If forceDeployed is set, mark the account as deployed directly
    if (forceDeployed && account.isDeployed) {
      console.log("Force marking account as deployed");
      account.isDeployed = async () => true;
    }

    // Encode transaction data
    const data = encodeFunctionData({
      abi: erc20ABI,
      functionName: "approve",
      args: [spenderAddress, allowanceAmount],
    });

    // Use our helper function to send the transaction
    const txHash = await sendSmartAccountTransaction(contractAddress, data);

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    return {
      transactionHash: txHash,
      receipt,
      smartAccountAddress: account.address,
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
    const contractAddress =
      process.env.NEXT_PUBLIC_CELO_TOKEN_ADDRESS ||
      "0xb2CfbF986e91beBF31f31CCf41EDa83384c3e7d5";
    const spenderAddress =
      process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS ||
      "0x884184a9aFb1B8f44fAd1C74a63B739A7c82801D";
    const allowanceAmount = "100000";

    // Encode the data for transaction
    const data = encodeFunctionData({
      abi: erc20ABI,
      functionName: "approve",
      args: [spenderAddress, allowanceAmount],
    });

    // Use helper function to send the transaction
    const txHash = await sendSmartAccountTransaction(contractAddress, data);

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

    // Encode the data for transaction
    const data = encodeFunctionData({
      abi: lendingABI,
      functionName: "deposit",
      args: [tokenAddress, amount],
    });

    // Use helper function to send the transaction
    const txHash = await sendSmartAccountTransaction(contractAddress, data);

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

    // Encode the data for transaction
    const data = encodeFunctionData({
      abi: lendingABI,
      functionName: "withdraw",
      args: [tokenAddress, amount],
    });

    // Use helper function to send the transaction
    const txHash = await sendSmartAccountTransaction(contractAddress, data);

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

    // Encode the data for transaction
    const data = encodeFunctionData({
      abi: lendingABI,
      functionName: "borrow",
      args: [tokenAddress, amount],
    });

    // Use helper function to send the transaction
    const txHash = await sendSmartAccountTransaction(contractAddress, data);

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

    const isDeployed = account ? await account.isDeployed() : false;

    return [
      {
        address:
          account?.address || "0x0000000000000000000000000000000000000000",
        isDeployed,
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
