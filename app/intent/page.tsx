"use client";

import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as React from "react";
import { IntentHistory } from "@/components/intent/intent-history";
import { IntentExecutionPlan } from "@/lib/services/intent-service";
import GlitchText from "@/components/animations/glitch";
import Link from "next/link";
import IntentAgent from "@/components/intent/intent-agent";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import WalletConnect from "@/components/ui/WalletConnect";

// Add a custom type that extends IntentExecutionPlan
type IntentResultWithMetadata = IntentExecutionPlan & {
  estimatedCost?: string;
  estimatedTime?: string;
};

export default function IntentPage() {
  const [intent, setIntent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
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

  const { isConnected, address } = useAccount();

  const handleProcessIntent = async () => {
    if (!intent.trim()) {
      toast.error("Please enter an intent or use the AI agent to create one");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/intent/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          intent, 
          chainId,
          userAddress: address
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process intent");
      }

      if (data.success) {
        setIntentResult(data.data);
        toast.success("Intent processed successfully");
      } else {
        throw new Error(data.error || "Failed to process intent");
      }
    } catch (error) {
      console.error("Error processing intent:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error processing intent. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setIntent("");
    setIntentResult(null);
    setExecutionStatus([]);
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

                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-600/10 to-orange-900/10 rounded-xl blur-xl"></div>
                    <div className="relative h-[800px]">
                      <IntentAgent onCreateIntent={setIntent} />
                    </div>
                  </div>
                </div>

                {intentResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="rounded-xl border border-orange-900/20 bg-gradient-to-br from-zinc-900/50 to-black p-6 mt-6 shadow-lg"
                  >
                    <h3
                      className="text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600 mb-6 flex items-center gap-2"
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

                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={handleClear}
                    className="border border-orange-900/20 bg-transparent text-gray-300 hover:bg-zinc-900 py-2.5 px-6 shadow-lg transition-all duration-300"
                  >
                    Clear
                  </Button>

                  {!intentResult &&
                    (!isConnected ? (
                      <WalletConnect />
                    ) : (
                      <Button
                        onClick={handleProcessIntent}
                        className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white py-2.5 px-8 shadow-[0_0_15px_rgba(234,88,12,0.2)] hover:shadow-[0_0_15px_rgba(234,88,12,0.4)] transition-all duration-300"
                        disabled={isProcessing || !intent}
                      >
                        {isProcessing ? (
                          <span className="flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Processing...
                          </span>
                        ) : (
                          "Process Intent"
                        )}
                      </Button>
                    ))}
                </div>
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
