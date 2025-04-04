"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CrossChainOpportunitiesProps {
  className?: string;
}

export function CrossChainOpportunities({
  className,
}: CrossChainOpportunitiesProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Cross-Chain Opportunities</CardTitle>
        <CardDescription>
          Highest yield opportunities across chains
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <OpportunityItem
          title="USDC Lending on Polygon"
          chain="Polygon"
          apy="8.3%"
          protocol="Aave"
          description="Lend your USDC on Polygon for the highest stablecoin APY"
          currentHolding="1,000 USDC on Ethereum"
          potentialGain="+1.1% APY"
        />

        <OpportunityItem
          title="ETH Staking on Celo"
          chain="Celo"
          apy="5.8%"
          protocol="Celo DeFi"
          description="Stake your ETH on Celo for higher rewards than Ethereum"
          currentHolding="2.5 ETH on Ethereum"
          potentialGain="+0.9% APY"
        />

        <OpportunityItem
          title="BTC LP on Arbitrum"
          chain="Arbitrum"
          apy="12.4%"
          protocol="SushiSwap"
          description="Provide BTC/ETH liquidity on Arbitrum for high APY"
          currentHolding="0.15 BTC on Bitcoin"
          potentialGain="+4.7% APY"
        />
      </CardContent>
    </Card>
  );
}

interface OpportunityItemProps {
  title: string;
  chain: string;
  apy: string;
  protocol: string;
  description: string;
  currentHolding: string;
  potentialGain: string;
}

function OpportunityItem({
  title,
  chain,
  apy,
  protocol,
  description,
  currentHolding,
  potentialGain,
}: OpportunityItemProps) {
  const chainColor =
    {
      Ethereum: "bg-blue-500",
      Polygon: "bg-purple-600",
      Celo: "bg-green-500",
      Arbitrum: "bg-blue-700",
      Avalanche: "bg-red-500",
    }[chain] || "bg-gray-500";

  return (
    <div className="flex flex-col space-y-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
      <div className="flex justify-between">
        <div>
          <div className="font-medium">{title}</div>
          <div className="flex items-center text-sm text-muted-foreground space-x-1">
            <div className={`h-2 w-2 rounded-full ${chainColor}`} />
            <span>{chain}</span>
            <span>•</span>
            <span>{protocol}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-green-600 dark:text-green-400">
            {apy}
          </div>
          <div className="text-xs text-green-600/80 dark:text-green-400/80">
            {potentialGain}
          </div>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">{description}</div>
      <div className="text-xs flex justify-between items-center">
        <div className="text-muted-foreground">Current: {currentHolding}</div>
        <Button
          size="sm"
          className="bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 text-white text-xs h-7"
        >
          Move Assets
        </Button>
      </div>
    </div>
  );
}
