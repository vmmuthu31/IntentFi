"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import * as React from "react";
import { IntentHistory } from "@/components/intent/intent-history";
import { IntentExecutionPlan } from "@/lib/services/intent-service";

const StandaloneFormLabel = ({
  htmlFor,
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Label>) => (
  <Label htmlFor={htmlFor} className={className} {...props}>
    {children}
  </Label>
);

const StandaloneFormDescription = ({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-muted-foreground text-sm ${className}`} {...props}>
    {children}
  </p>
);

const exampleSubset = [
  "Automatically sell 10% of my ETH when it reaches $5,000",
  "Move all my assets from Ethereum to Polygon to reduce gas fees",
  "Maintain a balanced portfolio that's 40% stablecoins, 30% blue-chip crypto, and 30% yield-generating positions",
  "Invest $200 in ETH every Friday, but only when the RSI is below 40",
];

// Add a custom type that extends IntentExecutionPlan
type IntentResultWithMetadata = IntentExecutionPlan & {
  estimatedCost?: string;
  estimatedTime?: string;
};

export default function IntentPage() {
  const [intent, setIntent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [intentResult, setIntentResult] =
    useState<IntentResultWithMetadata | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
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
      const lowerIntent = intent.toLowerCase().trim();

      if (/^(hi|hello|hey|greetings|hi there|howdy|sup)/i.test(lowerIntent)) {
        setIntentResult({
          steps: [
            {
              description:
                "Hello! I'm your financial assistant. How can I help with your investments today?",
              chain: "N/A",
            },
          ],
        });
        toast.success("Greeting acknowledged");
        setIsProcessing(false);
        return;
      }

      const financialKeywords = [
        "invest",
        "yield",
        "earn",
        "stake",
        "swap",
        "trade",
        "buy",
        "sell",
        "token",
        "coin",
        "crypto",
        "nft",
        "defi",
        "eth",
        "btc",
        "bitcoin",
        "ethereum",
        "usdc",
        "usdt",
        "dai",
        "portfolio",
        "asset",
        "balance",
        "wallet",
        "chain",
        "blockchain",
        "bridge",
        "transfer",
        "liquidity",
        "pool",
        "apy",
        "interest",
        "loan",
        "borrow",
        "lend",
        "collateral",
        "leverage",
        "position",
        "protocol",
        "smart contract",
        "rebalance",
        "diversify",
        "risk",
        "profit",
        "loss",
        "dollar",
        "$",
        "percentage",
        "%",
        "price",
        "value",
      ];

      const isQuestionPattern =
        /^(who|what|when|where|why|how|is|are|can|could|do|does|which|whose)\s/i.test(
          lowerIntent
        );

      const containsFinancialKeyword = financialKeywords.some((keyword) =>
        lowerIntent.includes(keyword)
      );

      if (
        (isQuestionPattern && !containsFinancialKeyword) ||
        (!containsFinancialKeyword && lowerIntent.length < 15)
      ) {
        setIntentResult({
          steps: [
            {
              description:
                "I'm specialized in financial intents and DeFi operations. Please provide a finance-related request like 'Earn yield on USDC' or 'Invest in ETH weekly'.",
              chain: "N/A",
            },
          ],
        });
        toast.info("Please provide a financial intent");
        setIsProcessing(false);
        return;
      }

      const response = await fetch("/api/intent/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ intent }),
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

  const executeIntent = async () => {
    if (!intentResult || !isConnected) return;

    setIsExecuting(true);
    setExecutionStatus(
      intentResult.steps.map((_, index) => ({
        step: index,
        status: "pending",
      }))
    );

    try {
      for (let i = 0; i < intentResult.steps.length; i++) {
        setExecutionStatus((prev) =>
          prev.map((status, idx) =>
            idx === i ? { ...status, status: "processing" } : status
          )
        );

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const fakeTxHash = `0x${Math.random().toString(16).substring(2, 42)}`;

        setExecutionStatus((prev) =>
          prev.map((status, idx) =>
            idx === i
              ? { ...status, status: "complete", txHash: fakeTxHash }
              : status
          )
        );

        toast.success(
          `Completed step ${i + 1}: ${intentResult.steps[i].description}`
        );
      }

      toast.success("Intent execution completed successfully!");
    } catch (error) {
      console.error("Error executing intent:", error);
      toast.error("Failed to execute intent. Please try again.");

      const currentStep = executionStatus.findIndex(
        (s) => s.status === "processing"
      );
      if (currentStep !== -1) {
        setExecutionStatus((prev) =>
          prev.map((status, idx) =>
            idx === currentStep ? { ...status, status: "failed" } : status
          )
        );
      }
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-6">Create New Intent</h1>

        <Tabs defaultValue="natural" className="w-full">
          <TabsList className="w-full md:w-auto mb-6">
            <TabsTrigger value="natural">Natural Language</TabsTrigger>
            <TabsTrigger value="template">Templates</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="natural">
            <Card>
              <CardHeader>
                <CardTitle>Express your financial goal</CardTitle>
                <CardDescription>
                  Tell us what you want to achieve in simple language, and
                  we&apos;ll handle the complexity.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <StandaloneFormLabel htmlFor="intent" className="">
                      Your Intent
                    </StandaloneFormLabel>
                    <Textarea
                      id="intent"
                      placeholder="Example: 'Earn the highest yield on my USDC across all chains' or 'Convert 50% of my Bitcoin to a diversified DeFi portfolio'"
                      value={intent}
                      onChange={(e) => setIntent(e.target.value)}
                      className="min-h-32"
                    />
                    {!intentResult && (
                      <StandaloneFormDescription className="">
                        You can specify chains, tokens, percentages, and
                        conditions.
                      </StandaloneFormDescription>
                    )}
                    {!intentResult && (
                      <div>
                        <div>
                          <h3 className="text-sm font-medium">
                            Example intents to try:
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          {exampleSubset.map((example, index) => (
                            <div
                              key={index}
                              className="w-full flex justify-center"
                            >
                              <Button
                                variant="outline"
                                className="border-gray-50 hover:cursor-pointer bg-opacity-10 opacity-50 w-full text-left whitespace-normal break-words p-2 h-full flex items-center justify-center hover:opacity-100 transition-opacity duration-300"
                                onClick={() => handleExampleClick(example)}
                              >
                                {example}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {intentResult && (
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">
                        Intent Execution Plan
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">
                            Steps:
                          </h4>
                          <ol className="list-decimal pl-5 space-y-1">
                            {intentResult.steps.map((step, i) => (
                              <li key={i} className="text-sm">
                                {step.description}{" "}
                                <span className="text-xs text-muted-foreground">
                                  ({step.chain})
                                </span>
                                {executionStatus.length > 0 && (
                                  <span className="ml-2">
                                    {executionStatus[i]?.status === "pending" &&
                                      "⏳"}
                                    {executionStatus[i]?.status ===
                                      "processing" && "⚙️"}
                                    {executionStatus[i]?.status ===
                                      "complete" && "✅"}
                                    {executionStatus[i]?.status === "failed" &&
                                      "❌"}
                                  </span>
                                )}
                                {executionStatus[i]?.txHash && (
                                  <span className="text-xs ml-2 text-blue-500">
                                    Tx:{" "}
                                    {executionStatus[i]?.txHash.substring(
                                      0,
                                      10
                                    )}
                                    ...
                                  </span>
                                )}
                              </li>
                            ))}
                          </ol>
                        </div>
                        <div className="flex justify-end mt-4">
                          {isExecuting ? (
                            <Button disabled>
                              <span className="animate-spin mr-2">⚙️</span>{" "}
                              Executing...
                            </Button>
                          ) : executionStatus.length > 0 &&
                            executionStatus.every(
                              (s) => s.status === "complete"
                            ) ? (
                            <Button
                              variant="outline"
                              className="bg-green-50 text-green-600 border-green-200"
                            >
                              ✅ Execution Complete
                            </Button>
                          ) : (
                            <Button
                              onClick={executeIntent}
                              disabled={!isConnected}
                              className="bg-gradient-to-r from-purple-600 to-blue-500 text-white"
                            >
                              {!isConnected
                                ? "Connect Wallet to Execute"
                                : "Execute This Intent"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setIntent("")}>
                  Clear
                </Button>
                {/* if no wallet connected then dontallow to process intent   */}
                {!isConnected ? (
                  <Button variant="outline" disabled>
                    Connect Wallet to Process Intent
                  </Button>
                ) : (
                  <Button
                    onClick={handleProcessIntent}
                    disabled={isProcessing || !intent}
                  >
                    {isProcessing ? "Processing..." : "Process Intent"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="template">
            <Card>
              <CardHeader>
                <CardTitle>Intent Templates</CardTitle>
                <CardDescription>
                  Choose from pre-built intent templates for common financial
                  goals.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Card
                      key={i}
                      className="border cursor-pointer hover:border-primary/50"
                      onClick={() => setIntent(template.intent)}
                    >
                      <CardHeader className="p-4">
                        <CardTitle className="text-md">
                          {template.title}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Intent Creation</CardTitle>
                <CardDescription>
                  Build complex intents with conditional logic and multi-step
                  execution.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-8 text-center">
                  <h3 className="font-medium mb-2">Advanced Intent Builder</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    The visual intent builder is coming soon. In the meantime,
                    you can use the natural language interface.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() =>
                      document
                        .querySelector('[data-value="natural"]')
                        ?.dispatchEvent(new Event("click"))
                    }
                  >
                    Switch to Natural Language
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <IntentHistory />
      </div>
    </main>
  );
}
