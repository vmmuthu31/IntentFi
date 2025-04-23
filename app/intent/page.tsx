"use client";

import { useState, useCallback } from "react";
import { useAccount, useChainId } from "wagmi";
import { toast } from "sonner";
import * as React from "react";
import { IntentHistory } from "@/components/intent/intent-history";
import { IntentExecutionPlan } from "@/lib/services/intent-service";
import GlitchText from "@/components/animations/glitch";
import Link from "next/link";
import IntentAgent from "@/components/intent/IntentAgent";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import WalletConnect from "@/components/ui/WalletConnect";
import { ethers } from "ethers";

// Define Ethereum provider interface
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (eventName: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (
    eventName: string,
    listener: (...args: unknown[]) => void
  ) => void;
  isMetaMask?: boolean;
  // Add other properties as needed
}

// Add a custom type that extends IntentExecutionPlan
type IntentResultWithMetadata = IntentExecutionPlan & {
  estimatedCost?: string;
  estimatedTime?: string;
};

export default function IntentPage() {
  const chainId = useChainId();
  const [intentResult, setIntentResult] =
    useState<IntentResultWithMetadata | null>(null);
  const [executionStatus, setExecutionStatus] = useState<
    Array<{
      step: number;
      status: "pending" | "processing" | "complete" | "failed";
      txHash?: string;
    }>
  >([]);

  const { address, isConnected } = useAccount();

  // Function to execute a transfer directly in the browser with MetaMask
  const executeTransferDirectly = useCallback(
    async (to: string, amount: string, token: string, chainId: number) => {
      try {
        // Set status to processing
        if (intentResult) {
          setExecutionStatus(
            intentResult.steps.map((_, index) => ({
              step: index,
              status: index === 0 ? "processing" : "pending",
            }))
          );
        }

        toast.info("Connecting to MetaMask...");

        // Ensure ethereum is available in window
        if (typeof window.ethereum === "undefined") {
          throw new Error("MetaMask is not installed");
        }

        // Request account access
        const ethereum = window.ethereum as EthereumProvider;
        await ethereum.request({ method: "eth_requestAccounts" });

        // Create a Web3Provider using the ethereum object
        const provider = new ethers.providers.Web3Provider(ethereum);

        // Check if the wallet is connected to the correct network
        const network = await provider.getNetwork();
        if (network.chainId !== chainId) {
          toast.error(
            `Please switch to the correct network (Chain ID: ${chainId})`
          );

          // Try to switch the network for the user
          try {
            await ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: `0x${chainId.toString(16)}` }],
            });
            toast.success("Network switched successfully");
          } catch (error) {
            console.error("Network switch error:", error);
            toast.error(
              "Failed to switch network. Please switch manually in your wallet."
            );
            throw new Error(
              "Network mismatch, please switch to the correct network"
            );
          }
        }

        const signer = provider.getSigner();

        // Get the actual to address (handle both regular addresses and ENS names)
        let recipientAddress = to;

        // Handle specific case where to address is N/A
        if (to === "N/A") {
          toast.error(
            "Invalid recipient address 'N/A'. Please provide a valid address."
          );
          throw new Error("Invalid recipient address 'N/A'");
        }

        // Basic validation of the address format
        if (to.startsWith("0x")) {
          // Validate the address is a proper format
          if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
            toast.error(
              "Invalid Ethereum address format. Addresses must be 42 characters including 0x prefix."
            );
            throw new Error("Invalid Ethereum address format");
          }

          try {
            // Additional validation with ethers
            recipientAddress = ethers.utils.getAddress(to); // This will check the checksum and throw if invalid

            // Check if it's a contract or EOA (optional, can be removed if causing issues)
            // const code = await provider.getCode(recipientAddress);
            // if (code !== '0x') {
            //   toast.warning("The address appears to be a contract. Make sure it can handle token transfers.");
            // }
          } catch (error) {
            console.error("Address validation error:", error);
            toast.error(
              "Invalid checksum address. Please double-check the address."
            );
            throw new Error("Invalid Ethereum address checksum");
          }
        }
        // Check if the recipient looks like an ENS name
        else if (to.includes(".eth") || to.includes(".")) {
          try {
            // Try to resolve the ENS name
            toast.info("Resolving address...");
            const resolved = await provider.resolveName(to);
            if (!resolved) {
              toast.error(
                `Could not resolve ${to} to an address. ENS may not be supported on this network.`
              );
              throw new Error(`Could not resolve ${to} to an address`);
            }

            recipientAddress = resolved;
            toast.success(`Resolved to ${recipientAddress}`);
          } catch (ensError) {
            console.error("ENS resolution error:", ensError);
            toast.error(
              `Failed to resolve ${to} to an address. ENS may not be supported on this network.`
            );
            throw new Error(`ENS resolution failed for ${to}`);
          }
        } else {
          toast.error(
            "Invalid address format. Must be an Ethereum address (0x...) or ENS name."
          );
          throw new Error("Invalid address format");
        }

        let localTxHash = "";

        // Execute the appropriate transaction based on token type
        if (token.toUpperCase() === "CELO") {
          // Native token transfer
          toast.info("Preparing transaction, please check your wallet...");

          try {
            console.log(`Sending ${amount} CELO to ${recipientAddress}`);

            // Get balance first to check if user has enough funds
            const balance = await provider.getBalance(
              await signer.getAddress()
            );
            const amountInWei = ethers.utils.parseEther(amount);

            console.log(
              `User balance: ${ethers.utils.formatEther(balance)} CELO`
            );
            console.log(
              `Amount to send: ${ethers.utils.formatEther(amountInWei)} CELO`
            );

            // Check if user has enough balance including estimated gas
            if (balance.lt(amountInWei.add(ethers.utils.parseEther("0.005")))) {
              toast.error(
                `Insufficient balance. You need at least ${amount} CELO plus gas.`
              );
              throw new Error("Insufficient balance for transfer");
            }

            // Get gas price
            const gasPrice = await provider.getGasPrice();
            console.log(
              `Current gas price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`
            );

            // Use our retry function
            const receipt = await sendTransactionWithRetry(
              // Transaction function
              () =>
                signer.sendTransaction({
                  to: recipientAddress,
                  value: amountInWei,
                  gasLimit: 100000, // Explicitly set gas limit
                  gasPrice: gasPrice, // Use current gas price
                }),
              // Set hash function
              (hash) => {
                localTxHash = hash;
              }
            );

            // Use localTxHash if needed
            console.log("Transaction hash for UI:", localTxHash);

            // Update execution status
            if (intentResult) {
              setExecutionStatus(
                intentResult.steps.map((_, index) => ({
                  step: index,
                  status: "complete",
                  txHash: index === 0 ? receipt.transactionHash : undefined,
                }))
              );
            }

            toast.success("Transfer completed successfully!");
            return {
              success: true,
              transactionHash: localTxHash, // Use transactionHash consistently
            };
          } catch (error: unknown) {
            console.error("CELO transfer error:", error);

            // Check for user rejection - need to type-check error properties
            if (
              error &&
              typeof error === "object" &&
              (("code" in error && error.code === 4001) ||
                ("message" in error &&
                  typeof error.message === "string" &&
                  error.message.includes("user rejected")))
            ) {
              toast.error("Transaction was rejected by user");
            }
            // Check for other errors
            else {
              const errorMessage =
                error && typeof error === "object" && "message" in error
                  ? error.message
                  : "Transaction failed, please try again";
              toast.error(
                typeof errorMessage === "string"
                  ? errorMessage
                  : "Unknown error occurred"
              );
            }

            if (intentResult) {
              setExecutionStatus(
                intentResult.steps.map((_, index) => ({
                  step: index,
                  status: "failed",
                }))
              );
            }

            throw error;
          }
        } else {
          // ERC20 token transfer
          // Define token addresses for different chains
          const tokenAddresses: Record<number, string> = {
            44787: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B", // USDC on Celo Alfajores
            31: "0xa683146bb93544068737dfca59f098e7844cdfa8", // USDC on Rootstock testnet
          };

          toast.info("Preparing token transfer, please check your wallet...");

          try {
            const tokenAddress = tokenAddresses[chainId];
            if (!tokenAddress) {
              throw new Error(`${token} not supported on chain ${chainId}`);
            }

            console.log(`Sending ${amount} ${token} to ${recipientAddress}`);
            console.log(`Token contract: ${tokenAddress}`);

            // ERC20 transfer ABI fragment
            const erc20Abi = [
              {
                constant: false,
                inputs: [
                  { name: "_to", type: "address" },
                  { name: "_value", type: "uint256" },
                ],
                name: "transfer",
                outputs: [{ name: "", type: "bool" }],
                payable: false,
                stateMutability: "nonpayable",
                type: "function",
              },
              {
                constant: true,
                inputs: [],
                name: "decimals",
                outputs: [{ name: "", type: "uint8" }],
                payable: false,
                stateMutability: "view",
                type: "function",
              },
              {
                constant: true,
                inputs: [{ name: "_owner", type: "address" }],
                name: "balanceOf",
                outputs: [{ name: "", type: "uint256" }],
                payable: false,
                stateMutability: "view",
                type: "function",
              },
            ];

            // Create contract instance
            const tokenContract = new ethers.Contract(
              tokenAddress,
              erc20Abi,
              signer
            );

            // Get token decimals (default to 6 for USDC if there's an issue)
            let decimals;
            try {
              decimals = await tokenContract.decimals();
              console.log(`Token decimals: ${decimals}`);
            } catch (error) {
              console.error("Error getting decimals:", error);
              decimals = 6; // Default for USDC
              console.log(`Using default decimals: ${decimals}`);
            }

            // Check token balance
            const signerAddress = await signer.getAddress();
            const tokenBalance = await tokenContract.balanceOf(signerAddress);
            console.log(
              `Token balance: ${ethers.utils.formatUnits(tokenBalance, decimals)} ${token}`
            );

            // Parse amount with correct decimals
            const parsedAmount = ethers.utils.parseUnits(amount, decimals);
            console.log(
              `Amount to send in base units: ${parsedAmount.toString()}`
            );

            // Check if balance is sufficient
            if (tokenBalance.lt(parsedAmount)) {
              toast.error(
                `Insufficient ${token} balance. You have ${ethers.utils.formatUnits(tokenBalance, decimals)} but need ${amount}`
              );
              throw new Error(`Insufficient ${token} balance`);
            }

            // Get gas estimate and price
            const gasPrice = await provider.getGasPrice();
            console.log(
              `Current gas price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`
            );

            // Check if the user has enough native token for gas
            const nativeBalance = await provider.getBalance(signerAddress);
            const estimatedGasCost = gasPrice.mul(150000); // Approximate gas limit for ERC20 transfers

            if (nativeBalance.lt(estimatedGasCost)) {
              toast.error(
                `Insufficient balance for gas. You need some CELO for transaction fees.`
              );
              throw new Error("Insufficient balance for gas");
            }

            // Use our retry function for ERC20 transfer
            const receipt = await sendTransactionWithRetry(
              // Transaction function - tokenContract.transfer wrapped in a function
              () =>
                tokenContract.transfer(recipientAddress, parsedAmount, {
                  gasLimit: 150000,
                  gasPrice: gasPrice,
                }),
              // Set hash function
              (hash) => {
                localTxHash = hash;
              }
            );

            // Use localTxHash if needed
            console.log("Transaction hash for UI:", localTxHash);

            // Update execution status
            if (intentResult) {
              setExecutionStatus(
                intentResult.steps.map((_, index) => ({
                  step: index,
                  status: "complete",
                  txHash: index === 0 ? receipt.transactionHash : undefined,
                }))
              );
            }

            toast.success("Transfer completed successfully!");
            return {
              success: true,
              transactionHash: localTxHash, // Use transactionHash consistently
            };
          } catch (error: unknown) {
            console.error("Token transfer error:", error);

            // Check for user rejection - need to type-check error properties
            if (
              error &&
              typeof error === "object" &&
              (("code" in error && error.code === 4001) ||
                ("message" in error &&
                  typeof error.message === "string" &&
                  error.message.includes("user rejected")))
            ) {
              toast.error("Transaction was rejected by user");
            }
            // Check for other errors
            else {
              const errorMessage =
                error && typeof error === "object" && "message" in error
                  ? error.message
                  : "Transaction failed, please try again";
              toast.error(
                typeof errorMessage === "string"
                  ? errorMessage
                  : "Unknown error occurred"
              );
            }

            if (intentResult) {
              setExecutionStatus(
                intentResult.steps.map((_, index) => ({
                  step: index,
                  status: "failed",
                }))
              );
            }

            throw error;
          }
        }
      } catch (error) {
        console.error("Error executing transfer:", error);

        // Update execution status to failed
        if (intentResult) {
          setExecutionStatus(
            intentResult.steps.map((_, index) => ({
              step: index,
              status: "failed",
            }))
          );
        }

        toast.error(
          error instanceof Error ? error.message : "Transaction failed"
        );
        return {
          success: false,
          error,
        };
      }
    },
    [intentResult, setExecutionStatus]
  );

  // Helper function for sending transactions with automatic retry
  const sendTransactionWithRetry = async (
    txFunc: () => Promise<ethers.providers.TransactionResponse>,
    setTxHash: (hash: string) => void,
    maxRetries = 2
  ): Promise<{ transactionHash: string; gasUsed?: ethers.BigNumber }> => {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          toast.info(
            `Retrying transaction (attempt ${attempt}/${maxRetries})...`
          );
        }

        // Send the transaction
        const tx = await txFunc();

        console.log(`Transaction sent: ${tx.hash}`);
        setTxHash(tx.hash);
        toast.info("Transaction sent! Waiting for confirmation...");

        // Wait for transaction to be mined with a timeout
        const receipt = (await Promise.race([
          tx.wait(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Transaction confirmation timeout")),
              60000
            )
          ),
        ])) as ethers.providers.TransactionReceipt;

        console.log(`Transaction confirmed: ${receipt.transactionHash}`);
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);

        return {
          transactionHash: receipt.transactionHash,
          gasUsed: receipt.gasUsed,
        };
      } catch (error: unknown) {
        console.error(`Transaction attempt ${attempt + 1} failed:`, error);
        lastError = error;

        // Check if this is a nonce error that we can retry
        const errorMsg =
          error && typeof error === "object" && "message" in error
            ? String(error.message).toLowerCase()
            : "";

        const isNonceError =
          errorMsg.includes("nonce") ||
          errorMsg.includes("already mined") ||
          errorMsg.includes("replacement transaction underpriced");

        // If it's not a nonce error or user rejection, we can retry
        if (isNonceError && attempt < maxRetries) {
          console.log(
            "Detected nonce issue, will retry with fresh transaction"
          );
          // Wait a bit before retrying
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }

        // For user rejection or other errors, or if we've exhausted retries, just throw
        throw error;
      }
    }

    // If we get here, we've exhausted retries
    throw lastError;
  };

  // This function is called by the IntentAgent component
  const handleCreateIntent = async (newIntent: string) => {
    if (!newIntent.trim()) {
      toast.error("Please enter an intent or use the AI agent to create one");
      return;
    }

    // Initialize execution status for each step as pending
    if (intentResult) {
      setExecutionStatus(
        intentResult.steps.map((_, index: number) => ({
          step: index,
          status: "pending",
        }))
      );
    }

    try {
      const response = await fetch("/api/intent/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: newIntent,
          chainId,
          userAddress: address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process intent");
      }

      if (data.success) {
        setIntentResult(data.data);

        // Check if KYC verification is required
        if (data.data.requiresKyc) {
          toast.warning("KYC verification required for this operation", {
            action: {
              label: "Verify Now",
              onClick: () =>
                (window.location.href =
                  data.data.steps[0].redirectUrl || "/verify?redirect=/intent"),
            },
            duration: 10000,
          });
          return;
        }

        // Check if wallet connection is required
        if (data.data.requiresWalletConnect) {
          if (!isConnected) {
            toast.warning("Wallet connection required for this operation", {
              action: {
                label: "Connect Wallet",
                onClick: () => {
                  // This should trigger the wallet connection flow
                  const connectButton = document.querySelector(
                    '[aria-label="Connect wallet"]'
                  );
                  if (connectButton && connectButton instanceof HTMLElement) {
                    connectButton.click();
                  }
                },
              },
              duration: 10000,
            });
          } else {
            // Check if this is a transfer operation that we can handle directly
            const step = data.data.steps[0];

            if (step && step.details && step.details.action === "transfer") {
              // This is a transfer that needs wallet interaction

              // Get transfer parameters from the step
              const { to, amount, symbol, chainId } = step.details.params;

              // Handle case where recipient is N/A - ask user for recipient address
              if (to === "N/A") {
                toast.warning("Recipient address is required", {
                  description:
                    "The transfer operation requires a valid recipient address",
                  action: {
                    label: "Enter Address",
                    onClick: () => {
                      const recipientAddress = prompt(
                        "Enter recipient address (0x... or ENS name):"
                      );
                      if (recipientAddress && recipientAddress.trim()) {
                        // Execute with provided address
                        executeTransferDirectly(
                          recipientAddress.trim(),
                          amount,
                          symbol,
                          Number(chainId)
                        );
                      }
                    },
                  },
                  duration: 15000,
                });
                return;
              }

              toast.info("Initiating transfer via MetaMask...");

              // Execute the transfer directly in the browser
              executeTransferDirectly(to, amount, symbol, Number(chainId))
                .then((result) => {
                  if (intentResult) {
                    const updatedSteps = [...intentResult.steps];
                    if (updatedSteps[0]) {
                      updatedSteps[0].description = `Successfully transferred ${amount} ${symbol} to ${to}.`;

                      if (
                        result.success &&
                        "transactionHash" in result &&
                        typeof result.transactionHash === "string"
                      ) {
                        updatedSteps[0].transactionHash =
                          result.transactionHash;
                      }

                      // Update the state
                      setIntentResult({
                        ...intentResult,
                        steps: updatedSteps,
                        requiresWalletConnect: false,
                      });

                      setExecutionStatus(
                        intentResult.steps.map((_, index) => ({
                          step: index,
                          status: "complete" as const,
                          txHash:
                            index === 0
                              ? updatedSteps[0].transactionHash
                              : undefined,
                        }))
                      );
                    }
                  }
                })
                .catch((error) => {
                  console.error("Error during executeTransferDirectly:", error);
                });
            } else {
              // For other operations that require wallet
              toast.warning(
                "This operation requires interaction with your wallet",
                {
                  description:
                    "Please approve the transaction when your wallet prompts you",
                  duration: 10000,
                }
              );
            }
          }
          return;
        }

        // Set execution status for new intent steps
        setExecutionStatus(
          data.data.steps.map((_: unknown, index: number) => ({
            step: index,
            status: "complete" as const,
            txHash: data.data.steps[index].transactionHash || undefined,
          }))
        );

        toast.success("Intent processed successfully");
      } else {
        throw new Error(data.error || "Failed to process intent");
      }
    } catch (error) {
      console.error("Error processing intent:", error);

      // Set execution status to failed if error occurs
      if (intentResult) {
        setExecutionStatus(
          intentResult.steps.map((_: unknown, index: number) => ({
            step: index,
            status: "failed" as const,
          }))
        );
      }

      toast.error(
        error instanceof Error
          ? error.message
          : "Error processing intent. Please try again."
      );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      <section className="px-4 py-10 md:py-12">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-6xl md:text-7xl font-light tracking-tight mb-4"
            >
              Turn words into
              <br />
              <span
                style={{ fontFamily: "var(--font-instrument-serif)" }}
                className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600 italic"
              >
                powerful strategies.
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-400 mt-6 mb-8 max-w-2xl mx-auto"
            >
              Express your financial goals in simple language, and we&apos;ll
              handle the complexity. No gas. No code. No limits.
            </motion.p>
          </div>

          <div className="rounded-2xl border border-orange-900/20 bg-gradient-to-b from-zinc-900/30 to-black p-8 overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.3)]">
            <div className="grid gap-8">
              <div className="grid gap-5">
                <div>
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600 mb-6"
                    style={{ fontFamily: "var(--font-instrument-serif)" }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-orange-500 animate-pulse">•</span>
                      <GlitchText
                        text="IntentFi Agent"
                        className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600 hover:cursor-pointer"
                      />
                    </div>
                  </motion.h2>

                  {isConnected ? (
                    <div className="relative">
                      <div className="absolute -inset-1 bg-gradient-to-r from-orange-600/10 to-orange-900/10 rounded-xl blur-xl"></div>
                      <div className="relative h-[800px]">
                        <IntentAgent onCreateIntent={handleCreateIntent} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 flex items-center gap-2 text-sm font-light">
                      Connect your wallet to start using IntentFi Agent{" "}
                      <WalletConnect />
                    </div>
                  )}
                </div>

                {intentResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="rounded-xl border border-orange-900/20 bg-gradient-to-br from-zinc-900/50 to-black p-6  shadow-lg"
                  >
                    <h3
                      className="text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600  flex items-center gap-2"
                      style={{ fontFamily: "var(--font-instrument-serif)" }}
                    >
                      <GlitchText
                        text="Intent Execution Plan"
                        className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600 hover:cursor-pointer"
                      />
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <ol className="list-none space-y-4">
                          {intentResult.steps.map((step, i) => (
                            <motion.li
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              key={i}
                              className="text-gray-300 pl-8 relative bg-zinc-900/30 p-4 rounded-lg border border-zinc-800"
                            >
                              <div className="flex-shrink-0 absolute left-0 top-4 transform -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-orange-800 flex items-center justify-center text-white font-bold shadow-[0_0_10px_rgba(234,88,12,0.3)]">
                                {i + 1}
                              </div>
                              <p className="font-light text-base text-gray-200">
                                {step.description}
                              </p>
                              <div className="flex items-center mt-2.5 text-sm">
                                <span className="text-gray-500 bg-zinc-900/60 py-1 px-2.5 rounded-full border border-zinc-800 text-xs">
                                  Chain: {step.chain}
                                </span>
                                {executionStatus.length > 0 && (
                                  <span className="ml-3 flex items-center">
                                    {executionStatus[i]?.status ===
                                      "pending" && (
                                      <span className="flex items-center bg-yellow-900/30 text-yellow-500 py-1 px-2.5 rounded-full text-xs border border-yellow-900/30">
                                        <span className="animate-pulse mr-1.5">
                                          •
                                        </span>{" "}
                                        Pending
                                      </span>
                                    )}
                                    {executionStatus[i]?.status ===
                                      "processing" && (
                                      <span className="flex items-center bg-blue-900/30 text-blue-400 py-1 px-2.5 rounded-full text-xs border border-blue-900/30">
                                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />{" "}
                                        Processing
                                      </span>
                                    )}
                                    {executionStatus[i]?.status ===
                                      "complete" && (
                                      <span className="flex items-center bg-green-900/30 text-green-500 py-1 px-2.5 rounded-full text-xs border border-green-900/30">
                                        <span className="mr-1.5">✓</span>{" "}
                                        Complete
                                      </span>
                                    )}
                                    {executionStatus[i]?.status ===
                                      "failed" && (
                                      <span className="flex items-center bg-red-900/30 text-red-500 py-1 px-2.5 rounded-full text-xs border border-red-900/30">
                                        <span className="mr-1.5">✕</span> Failed
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                              {step.transactionHash && (
                                <div className="mt-2 text-sm">
                                  <span className="text-gray-500">
                                    Transaction:{" "}
                                  </span>
                                  <a
                                    href={
                                      step.chain === "celoAlfajores"
                                        ? `https://alfajores.celoscan.io/tx/${step.transactionHash}`
                                        : step.chain === "rootstock"
                                          ? `https://explorer.testnet.rootstock.io/tx/${step.transactionHash}`
                                          : `#`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-orange-500 hover:text-orange-400 hover:underline transition-colors"
                                  >
                                    {step.transactionHash.substring(0, 10)}
                                    ...
                                    {step.transactionHash.substring(
                                      step.transactionHash.length - 10
                                    )}
                                  </a>
                                </div>
                              )}
                            </motion.li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-16">
            <div
              className="text-2xl mb-8 flex items-center gap-2"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">
                <GlitchText
                  text="Intent History"
                  className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600 hover:cursor-pointer"
                />
              </span>
            </div>

            <div className="rounded-2xl border border-orange-900/20 bg-gradient-to-b from-zinc-900/30 to-black p-6 shadow-[0_0_25px_rgba(0,0,0,0.3)]">
              <IntentHistory />
            </div>
          </div>
        </div>
      </section>

      <div className="border-b border-zinc-800/50 mt-12"></div>

      <footer className="py-8 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <p className="text-gray-500 text-sm font-light">
            Need help? Visit our{" "}
            <Link
              href="#"
              className="text-orange-500 hover:text-orange-400 transition-colors"
            >
              documentation
            </Link>{" "}
            or{" "}
            <Link
              href="#"
              className="text-orange-500 hover:text-orange-400 transition-colors"
            >
              contact support
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
