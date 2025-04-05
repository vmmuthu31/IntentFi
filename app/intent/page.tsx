"use client";

import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import * as React from "react";
import { IntentHistory } from "@/components/intent/intent-history";
import { IntentExecutionPlan } from "@/lib/services/intent-service";
import GlitchText from "@/components/animations/glitch";
import TypewriterEffect from "@/components/animations/TypewriterEffect";
import Link from "next/link";

const StandaloneFormLabel = ({
  htmlFor,
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Label>) => (
  <Label htmlFor={htmlFor} className={`text-gray-300 ${className}`} {...props}>
    {children}
  </Label>
);

const StandaloneFormDescription = ({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-gray-400 text-sm ${className}`} {...props}>
    {children}
  </p>
);

const exampleSubset = [
  "Deposit 10 USDC on Celo",
  "Borrow 10 rBTC on Rootstock",
  "Check my token balances on Celo network",
  "Provide liquidity with 5 CELO and 10 USDC",
];

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

  const { isConnected } = useAccount();

  const handleProcessIntent = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/intent/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ intent, chainId }),
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

  const handleExampleClick = (exampleText: string) => {
    setIntent(exampleText);

    setTimeout(() => {
      handleProcessIntent();
    }, 100);
  };

  const handleClear = () => {
    setIntent("");
    setIntentResult(null);
    setExecutionStatus([]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <section className="px-4 py-10 md:py-12">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-7xl font-light tracking-tight mb-4">
              <GlitchText
                text="Turn words into"
                className="hover:cursor-pointer"
              />
              <br />
              <span
                style={{ fontFamily: "InstrumentSerif" }}
                className="text-[#FA4C15] italic"
              >
                <TypewriterEffect text="powerful strategies." />
              </span>
            </h1>
            <p className="text-xl text-gray-400 mt-6 mb-8 max-w-2xl mx-auto">
              Express your financial goals in simple language, and we&apos;ll
              handle the complexity. No gas. No code. No limits.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8 overflow-hidden">
            <Tabs defaultValue="natural" className="w-full">
              <TabsList className="bg-gray-800/50 mb-8 rounded-xl p-1 gap-2 border border-gray-700">
                <TabsTrigger
                  value="natural"
                  className="data-[state=active]:bg-[#FA4C15] data-[state=active]:text-white rounded-lg text-gray-300"
                >
                  Natural Language
                </TabsTrigger>
                <TabsTrigger
                  value="template"
                  className="data-[state=active]:bg-[#FA4C15] data-[state=active]:text-white rounded-lg text-gray-300"
                >
                  Templates
                </TabsTrigger>
                <TabsTrigger
                  value="advanced"
                  className="data-[state=active]:bg-[#FA4C15] data-[state=active]:text-white rounded-lg text-gray-300"
                >
                  Advanced
                </TabsTrigger>
              </TabsList>

              <TabsContent value="natural">
                <div className="grid gap-8">
                  <div className="grid gap-4">
                    <div>
                      <StandaloneFormLabel
                        htmlFor="intent"
                        className="text-lg mb-2"
                      >
                        <span
                          className="text-xl text-[#FA4C15]"
                          style={{ fontFamily: "InstrumentSerif" }}
                        >
                          Your Intent
                        </span>
                      </StandaloneFormLabel>
                      <Textarea
                        id="intent"
                        placeholder="Example: 'Earn the highest yield on my USDC across all chains' or 'Convert 50% of my Bitcoin to a diversified DeFi portfolio'"
                        value={intent}
                        onChange={(e) => setIntent(e.target.value)}
                        className="min-h-32 bg-gray-800/50 border-gray-700 rounded-xl text-white placeholder:text-gray-500 p-4"
                      />
                      {!intentResult && (
                        <StandaloneFormDescription className="mt-2">
                          You can specify chains, tokens, percentages, and
                          conditions.
                        </StandaloneFormDescription>
                      )}
                    </div>

                    {!intentResult && (
                      <div className="mt-2">
                        <h3 className="text-gray-300 text-lg mb-4">
                          <span
                            className="text-xl text-[#FA4C15]"
                            style={{ fontFamily: "InstrumentSerif" }}
                          >
                            Example intents to try:
                          </span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {exampleSubset.map((example, index) => (
                            <div
                              key={index}
                              className="rounded-xl border border-gray-800 bg-gray-900/30 p-4 hover:border-[#FA4C15]/50 hover:bg-gray-800/50 transition-all duration-300 cursor-pointer"
                              onClick={() => handleExampleClick(example)}
                            >
                              <p className="text-gray-300">{example}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {intentResult && (
                      <div className="rounded-xl border border-gray-800 bg-gray-800/30 p-6 mt-6">
                        <h3
                          className="text-xl text-[#FA4C15] mb-4"
                          style={{ fontFamily: "InstrumentSerif" }}
                        >
                          <GlitchText
                            text="Intent Execution Plan"
                            className="text-[#FA4C15] hover:cursor-pointer"
                          />
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <ol className="list-none space-y-3">
                              {intentResult.steps.map((step, i) => (
                                <li
                                  key={i}
                                  className="text-gray-300 pl-8 relative"
                                >
                                  <div className="flex-shrink-0 absolute left-0 top-0 w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-[#FA4C15] font-bold">
                                    {i + 1}
                                  </div>
                                  <p>{step.description}</p>
                                  <div className="flex items-center mt-1 text-sm">
                                    <span className="text-gray-500">
                                      Chain: {step.chain}
                                    </span>
                                    {executionStatus.length > 0 && (
                                      <span className="ml-3">
                                        {executionStatus[i]?.status ===
                                          "pending" && "⏳ Pending"}
                                        {executionStatus[i]?.status ===
                                          "processing" && "⚙️ Processing"}
                                        {executionStatus[i]?.status ===
                                          "complete" && "✅ Complete"}
                                        {executionStatus[i]?.status ===
                                          "failed" && "❌ Failed"}
                                      </span>
                                    )}
                                  </div>
                                  {step.transactionHash && (
                                    <div className="mt-1 text-sm">
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
                                        className="text-blue-400 hover:underline"
                                      >
                                        {step.transactionHash.substring(0, 10)}
                                        ...
                                        {step.transactionHash.substring(
                                          step.transactionHash.length - 10
                                        )}
                                      </a>
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between mt-6">
                      <Button
                        variant="outline"
                        onClick={handleClear}
                        className="border border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 px-6 py-2"
                      >
                        Clear
                      </Button>

                      {!intentResult &&
                        (!isConnected ? (
                          <Button
                            variant="outline"
                            disabled
                            className="bg-gray-800 text-gray-500 border-gray-700 px-6 py-2"
                          >
                            Connect Wallet to Process Intent
                          </Button>
                        ) : (
                          <Button
                            onClick={handleProcessIntent}
                            className="bg-[#FA4C15] hover:bg-[#FA4C15]/90 text-white px-8 py-2"
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
              </TabsContent>

              <TabsContent value="template">
                <div className="grid gap-6">
                  <div
                    className="text-xl mb-4"
                    style={{ fontFamily: "InstrumentSerif" }}
                  >
                    <span className="text-[#FA4C15]">
                      <GlitchText
                        text="Intent Templates"
                        className="text-[#FA4C15] hover:cursor-pointer"
                      />
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      {
                        title: "Highest Yield Finder",
                        description:
                          "Find and move assets to highest yield opportunities across chains.",
                        intent:
                          "Earn the highest yield on my stablecoins across all chains",
                      },
                      {
                        title: "Portfolio Diversifier",
                        description:
                          "Diversify holdings across multiple assets and chains.",
                        intent:
                          "Diversify my portfolio to 40% ETH, 30% BTC, 20% stablecoins, and 10% DeFi tokens",
                      },
                      {
                        title: "Dollar Cost Averaging",
                        description:
                          "Automatically invest a fixed amount on a schedule.",
                        intent:
                          "Invest $100 in ETH every week regardless of price",
                      },
                      {
                        title: "Conditional Rebalancer",
                        description:
                          "Rebalance portfolio when certain conditions are met.",
                        intent:
                          "Rebalance my portfolio to equal parts BTC and ETH whenever they differ by more than 10%",
                      },
                    ].map((template, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-gray-800 bg-gray-900/30 p-6 hover:border-[#FA4C15]/50 transition-all duration-300 cursor-pointer"
                        onClick={() => setIntent(template.intent)}
                      >
                        <h3 className="text-xl text-white mb-2">
                          {template.title}
                        </h3>
                        <p className="text-gray-400 mb-4">
                          {template.description}
                        </p>
                        <div className="bg-gray-800/50 p-3 rounded-lg">
                          <p className="text-gray-300 italic">
                            &quot;{template.intent}&quot;
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced">
                <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-8 text-center">
                  <h3
                    className="text-2xl text-[#FA4C15] mb-4"
                    style={{ fontFamily: "InstrumentSerif" }}
                  >
                    <GlitchText
                      text="Advanced Intent Builder"
                      className="text-[#FA4C15] hover:cursor-pointer"
                    />
                  </h3>
                  <p className="text-gray-400 text-lg mb-6 max-w-2xl mx-auto">
                    The visual intent builder is coming soon. In the meantime,
                    you can use the natural language interface to create
                    powerful financial strategies.
                  </p>
                  <Button
                    className="bg-[#FA4C15] hover:bg-[#FA4C15]/90 text-white px-8 py-4 rounded-lg"
                    onClick={() =>
                      document
                        .querySelector('[data-value="natural"]')
                        ?.dispatchEvent(new Event("click"))
                    }
                  >
                    Switch to Natural Language
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="mt-16">
            <div
              className="text-2xl mb-8"
              style={{ fontFamily: "InstrumentSerif" }}
            >
              <span className="text-[#FA4C15]">
                <GlitchText
                  text="Intent History"
                  className="text-[#FA4C15] hover:cursor-pointer"
                />
              </span>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
              <IntentHistory />
            </div>
          </div>
        </div>
      </section>

      <div className="border-b border-gray-800 mt-12"></div>

      <footer className="py-8 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <p className="text-gray-500">
            Need help? Visit our{" "}
            <Link href="#" className="text-[#FA4C15] hover:underline">
              documentation
            </Link>{" "}
            or{" "}
            <Link href="#" className="text-[#FA4C15] hover:underline">
              contact support
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
