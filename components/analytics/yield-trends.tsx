"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function YieldTrends() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cross-Chain Yield Trends</CardTitle>
        <CardDescription>
          Track and compare yields across different chains and protocols
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="stablecoins">
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="stablecoins">Stablecoins</TabsTrigger>
            <TabsTrigger value="lending">Lending</TabsTrigger>
            <TabsTrigger value="liquidity">Liquidity Mining</TabsTrigger>
          </TabsList>

          <TabsContent value="stablecoins" className="space-y-4">
            <div className="h-[240px] w-full relative">
              {/* Chart visualization */}
              <div className="absolute inset-0">
                <div className="h-full w-full flex flex-col justify-between text-xs text-muted-foreground">
                  <div className="grid grid-cols-[50px_1fr] items-center">
                    <div className="text-right pr-2">10%</div>
                    <div className="border-t border-dashed border-gray-200 dark:border-gray-800"></div>
                  </div>
                  <div className="grid grid-cols-[50px_1fr] items-center">
                    <div className="text-right pr-2">8%</div>
                    <div className="border-t border-dashed border-gray-200 dark:border-gray-800"></div>
                  </div>
                  <div className="grid grid-cols-[50px_1fr] items-center">
                    <div className="text-right pr-2">6%</div>
                    <div className="border-t border-dashed border-gray-200 dark:border-gray-800"></div>
                  </div>
                  <div className="grid grid-cols-[50px_1fr] items-center">
                    <div className="text-right pr-2">4%</div>
                    <div className="border-t border-dashed border-gray-200 dark:border-gray-800"></div>
                  </div>
                  <div className="grid grid-cols-[50px_1fr] items-center">
                    <div className="text-right pr-2">2%</div>
                    <div className="border-t border-dashed border-gray-200 dark:border-gray-800"></div>
                  </div>
                  <div className="grid grid-cols-[50px_1fr] items-center">
                    <div className="text-right pr-2">0%</div>
                    <div className="border-t border-gray-200 dark:border-gray-800"></div>
                  </div>
                </div>
              </div>

              {/* Data lines */}
              <div className="absolute inset-0 pt-3 pb-5 pl-[50px]">
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 600 200"
                  preserveAspectRatio="none"
                >
                  {/* Polygon line */}
                  <path
                    d="M0,120 C30,110 60,95 90,85 C120,75 150,80 180,70 C210,60 240,50 270,45 C300,40 330,45 360,35 C390,25 420,20 450,25 C480,30 510,40 540,35 C570,30 600,25 600,25"
                    fill="none"
                    stroke="#9333ea"
                    strokeWidth="3"
                  />

                  {/* Ethereum line */}
                  <path
                    d="M0,140 C30,138 60,136 90,134 C120,132 150,130 180,128 C210,126 240,125 270,123 C300,121 330,120 360,118 C390,116 420,115 450,113 C480,111 510,110 540,108 C570,106 600,105 600,105"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                  />

                  {/* Celo line */}
                  <path
                    d="M0,130 C30,125 60,122 90,115 C120,108 150,105 180,90 C210,80 240,75 270,70 C300,65 330,60 360,55 C390,50 420,45 450,50 C480,55 510,60 540,55 C570,50 600,45 600,45"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                  />

                  {/* Arbitrum line */}
                  <path
                    d="M0,110 C30,105 60,100 90,95 C120,90 150,85 180,100 C210,115 240,110 270,105 C300,100 330,95 360,90 C390,85 420,80 450,75 C480,70 510,65 540,60 C570,55 600,50 600,50"
                    fill="none"
                    stroke="#1d4ed8"
                    strokeWidth="3"
                  />
                </svg>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              <YieldLegendItem
                chain="Polygon"
                apy="7.2%"
                color="bg-purple-600"
              />
              <YieldLegendItem
                chain="Ethereum"
                apy="4.8%"
                color="bg-blue-500"
              />
              <YieldLegendItem chain="Celo" apy="6.9%" color="bg-green-500" />
              <YieldLegendItem
                chain="Arbitrum"
                apy="7.5%"
                color="bg-blue-700"
              />
            </div>

            <div className="mt-2">
              <h4 className="text-sm font-medium mb-2">Yield Opportunities</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <YieldOpportunityItem
                  chain="Arbitrum"
                  protocol="GMX"
                  asset="USDC"
                  apy="7.5%"
                  tvl="$42.5M"
                />
                <YieldOpportunityItem
                  chain="Polygon"
                  protocol="Aave"
                  asset="USDC"
                  apy="7.2%"
                  tvl="$89.3M"
                />
                <YieldOpportunityItem
                  chain="Celo"
                  protocol="Moola Market"
                  asset="cUSD"
                  apy="6.9%"
                  tvl="$18.7M"
                />
                <YieldOpportunityItem
                  chain="Ethereum"
                  protocol="Lido"
                  asset="stETH"
                  apy="4.8%"
                  tvl="$320M"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="lending"
            className="h-[400px] flex items-center justify-center"
          >
            <div className="text-muted-foreground">
              Lending yields data will appear here
            </div>
          </TabsContent>

          <TabsContent
            value="liquidity"
            className="h-[400px] flex items-center justify-center"
          >
            <div className="text-muted-foreground">
              Liquidity mining yields data will appear here
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface YieldLegendItemProps {
  chain: string;
  apy: string;
  color: string;
}

function YieldLegendItem({ chain, apy, color }: YieldLegendItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`}></div>
      <div className="text-sm">
        {chain}: <span className="font-medium">{apy}</span>
      </div>
    </div>
  );
}

interface YieldOpportunityItemProps {
  chain: string;
  protocol: string;
  asset: string;
  apy: string;
  tvl: string;
}

function YieldOpportunityItem({
  chain,
  protocol,
  asset,
  apy,
  tvl,
}: YieldOpportunityItemProps) {
  const chainColor =
    {
      Ethereum: "bg-blue-500",
      Polygon: "bg-purple-600",
      Celo: "bg-green-500",
      Arbitrum: "bg-blue-700",
      Avalanche: "bg-red-500",
    }[chain] || "bg-gray-500";

  return (
    <div className="rounded-lg border p-3 flex justify-between hover:bg-accent/50 transition-colors">
      <div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${chainColor}`}></div>
          <span className="font-medium text-sm">
            {protocol} on {chain}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Asset: {asset} • TVL: {tvl}
        </div>
      </div>
      <div className="text-green-600 dark:text-green-400 font-bold">{apy}</div>
    </div>
  );
}
