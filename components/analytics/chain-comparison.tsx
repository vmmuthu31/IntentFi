"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ChainComparison() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chain Comparison</CardTitle>
        <CardDescription>
          Compare key metrics across chains to optimize your strategy
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] caption-bottom text-sm">
            <thead>
              <tr className="border-b">
                <th className="h-12 px-4 text-left align-middle font-medium">
                  Chain
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  Avg. APY
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  Gas Cost
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  TVL
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  Security
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium">
                  Ranking
                </th>
              </tr>
            </thead>
            <tbody>
              <ChainRow
                chain="Ethereum"
                color="bg-blue-500"
                apy="4.8%"
                gasCost="High"
                gasCostScore={1}
                tvl="$28.4B"
                tvlScore={5}
                security="Very High"
                securityScore={5}
                ranking={3}
              />
              <ChainRow
                chain="Polygon"
                color="bg-purple-600"
                apy="7.2%"
                gasCost="Low"
                gasCostScore={4}
                tvl="$1.2B"
                tvlScore={3}
                security="High"
                securityScore={4}
                ranking={1}
              />
              <ChainRow
                chain="Celo"
                color="bg-green-500"
                apy="6.9%"
                gasCost="Very Low"
                gasCostScore={5}
                tvl="$98M"
                tvlScore={2}
                security="High"
                securityScore={4}
                ranking={2}
              />
              <ChainRow
                chain="Arbitrum"
                color="bg-blue-700"
                apy="7.5%"
                gasCost="Medium"
                gasCostScore={3}
                tvl="$2.1B"
                tvlScore={4}
                security="High"
                securityScore={4}
                ranking={2}
              />
              <ChainRow
                chain="Avalanche"
                color="bg-red-500"
                apy="6.2%"
                gasCost="Low"
                gasCostScore={4}
                tvl="$780M"
                tvlScore={3}
                security="High"
                securityScore={4}
                ranking={4}
              />
            </tbody>
          </table>
        </div>

        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-medium">
            Recommended Chain Migration Strategies
          </h3>

          <div className="grid gap-3">
            <MigrationStrategy
              from="Ethereum"
              to="Polygon"
              assets="USDC"
              benefit="+2.4% APY, -92% gas fees"
              riskLevel="Low"
            />
            <MigrationStrategy
              from="Ethereum"
              to="Arbitrum"
              assets="ETH"
              benefit="+2.7% APY, -85% gas fees"
              riskLevel="Low"
            />
            <MigrationStrategy
              from="Ethereum"
              to="Celo"
              assets="Stablecoins"
              benefit="+2.1% APY, -98% gas fees"
              riskLevel="Medium"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ChainRowProps {
  chain: string;
  color: string;
  apy: string;
  gasCost: string;
  gasCostScore: number;
  tvl: string;
  tvlScore: number;
  security: string;
  securityScore: number;
  ranking: number;
}

function ChainRow({
  chain,
  color,
  apy,
  gasCost,
  gasCostScore,
  tvl,
  tvlScore,
  security,
  securityScore,
  ranking,
}: ChainRowProps) {
  return (
    <tr className="border-b transition-colors hover:bg-muted/50">
      <td className="p-4 align-middle">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${color} mr-2`}></div>
          <span className="font-medium">{chain}</span>
        </div>
      </td>
      <td className="p-4 align-middle">
        <span className="font-medium text-green-600 dark:text-green-400">
          {apy}
        </span>
      </td>
      <td className="p-4 align-middle">
        <div>
          <span>{gasCost}</span>
          <div className="mt-1 flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`w-5 h-1 mr-0.5 rounded-sm ${
                  i < gasCostScore
                    ? "bg-green-500"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              ></div>
            ))}
          </div>
        </div>
      </td>
      <td className="p-4 align-middle">
        <div>
          <span>{tvl}</span>
          <div className="mt-1 flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`w-5 h-1 mr-0.5 rounded-sm ${
                  i < tvlScore ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"
                }`}
              ></div>
            ))}
          </div>
        </div>
      </td>
      <td className="p-4 align-middle">
        <div>
          <span>{security}</span>
          <div className="mt-1 flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`w-5 h-1 mr-0.5 rounded-sm ${
                  i < securityScore
                    ? "bg-purple-500"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              ></div>
            ))}
          </div>
        </div>
      </td>
      <td className="p-4 align-middle">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 font-bold">
          {ranking}
        </div>
      </td>
    </tr>
  );
}

interface MigrationStrategyProps {
  from: string;
  to: string;
  assets: string;
  benefit: string;
  riskLevel: "Low" | "Medium" | "High";
}

function MigrationStrategy({
  from,
  to,
  assets,
  benefit,
  riskLevel,
}: MigrationStrategyProps) {
  const fromColor =
    {
      Ethereum: "bg-blue-500",
      Polygon: "bg-purple-600",
      Celo: "bg-green-500",
      Arbitrum: "bg-blue-700",
      Avalanche: "bg-red-500",
    }[from] || "bg-gray-500";

  const toColor =
    {
      Ethereum: "bg-blue-500",
      Polygon: "bg-purple-600",
      Celo: "bg-green-500",
      Arbitrum: "bg-blue-700",
      Avalanche: "bg-red-500",
    }[to] || "bg-gray-500";

  const riskColor = {
    Low: "text-green-600 dark:text-green-400",
    Medium: "text-yellow-600 dark:text-yellow-400",
    High: "text-red-600 dark:text-red-400",
  }[riskLevel];

  return (
    <div className="rounded-lg border p-3 flex items-center justify-between hover:bg-accent/50 transition-colors">
      <div className="flex items-center space-x-2">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full ${fromColor}`}></div>
          <span className="text-sm mx-1">{from}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M5 12h14"></path>
            <path d="m12 5 7 7-7 7"></path>
          </svg>
          <div className={`w-2 h-2 rounded-full ${toColor} ml-1`}></div>
          <span className="text-sm ml-1">{to}</span>
        </div>
        <div className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
          {assets}
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium text-green-600 dark:text-green-400">
          {benefit}
        </div>
        <div className={`text-xs ${riskColor}`}>Risk: {riskLevel}</div>
      </div>
    </div>
  );
}
