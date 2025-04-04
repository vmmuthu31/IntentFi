"use client";

import { useState } from "react";
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
// Standalone form components that don't rely on FormContext
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

export default function IntentPage() {
  const [intent, setIntent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [intentResult, setIntentResult] = useState<null | {
    steps: { description: string; chain: string }[];
    estimatedCost: string;
    estimatedTime: string;
  }>(null);

  const processIntent = () => {
    if (!intent) {
      toast.error("Please enter your financial intent");
      return;
    }

    setIsProcessing(true);

    // Simulate API call to process intent
    setTimeout(() => {
      // Mock response - in a real app, this would come from your intent processing service
      setIntentResult({
        steps: [
          {
            description: "Check current USDC balances across chains",
            chain: "Multiple",
          },
          {
            description: "Query yield rates across DeFi protocols",
            chain: "Multiple",
          },
          {
            description: "Bridge 3,000 USDC from Ethereum to Polygon",
            chain: "Ethereum → Polygon",
          },
          {
            description: "Deposit 3,000 USDC into Aave on Polygon",
            chain: "Polygon",
          },
          { description: "Set up monitoring for better rates", chain: "N/A" },
        ],
        estimatedCost: "$2.50",
        estimatedTime: "~3 minutes",
      });
      setIsProcessing(false);
    }, 2000);
  };

  const confirmIntent = () => {
    toast.success("Intent submitted successfully");
    // Would redirect to dashboard in real implementation
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1500);
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
                    <StandaloneFormDescription className="">
                      You can specify chains, tokens, percentages, and
                      conditions.
                    </StandaloneFormDescription>
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
                              </li>
                            ))}
                          </ol>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Estimated Cost:
                            </span>{" "}
                            {intentResult.estimatedCost}
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Estimated Time:
                            </span>{" "}
                            {intentResult.estimatedTime}
                          </div>
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
                {!intentResult ? (
                  <Button
                    onClick={processIntent}
                    disabled={isProcessing || !intent}
                  >
                    {isProcessing ? "Processing..." : "Process Intent"}
                  </Button>
                ) : (
                  <Button onClick={confirmIntent}>Confirm & Execute</Button>
                )}
              </CardFooter>
            </Card>

            {/* Example Intents Section */}
            <div className="mt-8 border rounded-lg p-6 bg-muted/30">
              <h3 className="text-lg font-medium mb-3">
                Example Intents to Try
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Click any example to use it as your intent. Our AI can
                understand various financial goals:
              </p>

              <div className="grid gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-primary mb-2">
                    🔍 Yield Optimization
                  </h4>
                  <div
                    className="p-3 border rounded-md bg-card hover:border-primary/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setIntent(
                        "I want to earn the highest yield on my USDC across all chains"
                      );
                      document
                        .getElementById("intent")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <p className="text-sm">
                      I want to earn the highest yield on my USDC across all
                      chains
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-primary mb-2">
                    🔄 Portfolio Rebalancing
                  </h4>
                  <div className="grid gap-3">
                    <div
                      className="p-3 border rounded-md bg-card hover:border-primary/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setIntent(
                          "Convert 50% of my Bitcoin to a diversified DeFi portfolio"
                        );
                        document
                          .getElementById("intent")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <p className="text-sm">
                        Convert 50% of my Bitcoin to a diversified DeFi
                        portfolio
                      </p>
                    </div>
                    <div
                      className="p-3 border rounded-md bg-card hover:border-primary/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setIntent(
                          "Maintain a balanced portfolio that&apos;s 40% stablecoins, 30% blue-chip crypto, and 30% yield-generating positions"
                        );
                        document
                          .getElementById("intent")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <p className="text-sm">
                        Maintain a balanced portfolio that&apos;s 40%
                        stablecoins, 30% blue-chip crypto, and 30%
                        yield-generating positions
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-primary mb-2">
                    ⏱️ Automated Trading
                  </h4>
                  <div className="grid gap-3">
                    <div
                      className="p-3 border rounded-md bg-card hover:border-primary/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setIntent(
                          "Invest $200 in ETH every Friday, but only when the RSI is below 40"
                        );
                        document
                          .getElementById("intent")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <p className="text-sm">
                        Invest $200 in ETH every Friday, but only when the RSI
                        is below 40
                      </p>
                    </div>
                    <div
                      className="p-3 border rounded-md bg-card hover:border-primary/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setIntent(
                          "Automatically sell 10% of my ETH when it reaches $5,000"
                        );
                        document
                          .getElementById("intent")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <p className="text-sm">
                        Automatically sell 10% of my ETH when it reaches $5,000
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-primary mb-2">
                    🌉 Cross-Chain Operations
                  </h4>
                  <div
                    className="p-3 border rounded-md bg-card hover:border-primary/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setIntent(
                        "Move all my assets from Ethereum to Polygon to reduce gas fees"
                      );
                      document
                        .getElementById("intent")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <p className="text-sm">
                      Move all my assets from Ethereum to Polygon to reduce gas
                      fees
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic">
                IntentFi can handle complex combinations of these operations,
                with conditions, timing requirements, and multi-step workflows.
              </p>
            </div>
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
