"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PortfolioOverviewProps {
  className?: string;
}

export function PortfolioOverview({ className }: PortfolioOverviewProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Portfolio Overview</CardTitle>
        <CardDescription>Your cross-chain asset distribution</CardDescription>
      </CardHeader>
      <CardContent className="px-2">
        <div className="h-[300px] w-full">
          <div className="flex h-full items-center justify-center">
            <div className="relative flex h-60 w-60">
              {/* Pie chart visualization - just a mockup for now */}
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 h-full w-full"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#9333ea"
                  strokeWidth="20"
                  strokeDasharray="45 100"
                  strokeDashoffset="25"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="20"
                  strokeDasharray="25 100"
                  strokeDashoffset="155"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="20"
                  strokeDasharray="15 100"
                  strokeDashoffset="130"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#6d28d9"
                  strokeWidth="20"
                  strokeDasharray="10 100"
                  strokeDashoffset="70"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="20"
                  strokeDasharray="5 100"
                  strokeDashoffset="115"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xl font-bold">$45,231.89</div>
                  <div className="text-xs text-muted-foreground">
                    Total Value
                  </div>
                </div>
              </div>
            </div>
            <div className="ml-8 grid gap-2">
              <div className="flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-purple-600" />
                <div className="text-sm font-medium">Ethereum (45%)</div>
              </div>
              <div className="flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-blue-600" />
                <div className="text-sm font-medium">Polygon (25%)</div>
              </div>
              <div className="flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-cyan-500" />
                <div className="text-sm font-medium">Celo (15%)</div>
              </div>
              <div className="flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-purple-800" />
                <div className="text-sm font-medium">Avalanche (10%)</div>
              </div>
              <div className="flex items-center">
                <div className="mr-2 h-3 w-3 rounded-full bg-indigo-600" />
                <div className="text-sm font-medium">Arbitrum (5%)</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
