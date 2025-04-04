"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const intentExamples = [
  "I want to earn the highest yield on my USDC across all chains",
  "Convert 50% of my Bitcoin to a diversified DeFi portfolio",
  "Invest $200 in ETH every Friday, but only when the RSI is below 40",
  "Maintain a balanced portfolio that's 40% stablecoins, 30% blue-chip crypto, and 30% yield-generating positions",
  "Move all my assets from Ethereum to Polygon to reduce gas fees",
  "Automatically sell 10% of my ETH when it reaches $5,000",
];

export function IntentInput() {
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!intent.trim()) return;

    // Add user message to conversation
    setConversation([...conversation, { role: "user", content: intent }]);

    // Simulate processing
    setLoading(true);
    setTimeout(() => {
      // Simulate AI response
      let response = "";

      if (
        intent.toLowerCase().includes("yield") ||
        intent.toLowerCase().includes("earn")
      ) {
        response =
          "I've analyzed yields across 8 blockchains. Currently, Polygon offers the highest USDC yield at 7.2% APY via Aave. Would you like me to transfer your USDC from Ethereum to Polygon to maximize your returns?";
      } else if (
        intent.toLowerCase().includes("bitcoin") ||
        intent.toLowerCase().includes("btc")
      ) {
        response =
          "I can help diversify your Bitcoin. Based on your risk profile, I recommend converting 50% to: 20% ETH, 15% MATIC, 10% AVAX, and 5% CELO. This would provide better risk-adjusted returns. Shall I proceed?";
      } else if (
        intent.toLowerCase().includes("every") ||
        intent.toLowerCase().includes("when")
      ) {
        response =
          "I've set up a conditional intent that will invest $200 in ETH every Friday, but only when the RSI indicator is below 40. This automated strategy will help you buy during market dips. I'll notify you before each transaction.";
      } else {
        response =
          "I understand your intent. Before executing this cross-chain strategy, I'll need to verify your identity once using Self Protocol. This will allow you to comply with regulations across all chains without repeatedly sharing your personal data. Would you like to proceed with identity verification?";
      }

      setConversation((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);
      setLoading(false);
      setIntent("");
    }, 1500);
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <CardTitle>Intent Expression</CardTitle>
        <CardDescription>
          Express your financial goals in natural language, and we&apos;ll
          execute them across chains
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conversation display */}
        {conversation.length > 0 && (
          <div className="mb-6 space-y-4 max-h-[400px] overflow-y-auto p-2">
            {conversation.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                  <div className="flex space-x-2">
                    <div className="h-2 w-2 rounded-full bg-current animate-bounce"></div>
                    <div
                      className="h-2 w-2 rounded-full bg-current animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="h-2 w-2 rounded-full bg-current animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Intent input form */}
        <form onSubmit={handleSubmit} className="relative">
          <Textarea
            placeholder="Tell IntentFI what you want to achieve..."
            className="min-h-[100px] resize-none pr-20"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            disabled={loading}
          />
          <Button
            type="submit"
            className="absolute bottom-4 right-4 rounded-full bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 text-white"
            size="sm"
            disabled={loading}
          >
            {loading ? "Processing..." : "Send Intent"}
          </Button>
        </form>

        {/* Intent examples */}
        {conversation.length === 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-medium mb-2">
              Example intents to try:
            </h3>
            <div className="grid gap-2">
              {intentExamples.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start h-auto py-2 px-4 text-left"
                  onClick={() => setIntent(example)}
                >
                  <span className="truncate">{example}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-lg pointer-events-none border border-transparent bg-gradient-to-br from-purple-600/20 via-blue-500/20 to-cyan-400/20"></div>
    </Card>
  );
}
