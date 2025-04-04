"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AnalyticsOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Performance</CardTitle>
        <CardDescription>
          30-day overview of your cross-chain portfolio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Total Value</div>
              <div className="font-bold text-xl">$45,231.89</div>
            </div>
            <div className="h-2 w-full rounded bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400"
                style={{ width: "70%" }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <div>30 days ago: $38,540.22</div>
              <div className="text-green-600 dark:text-green-400">+17.4%</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium mb-1">
                Best Performing Chain
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-purple-600 mr-2"></div>
                <span>Polygon</span>
              </div>
              <div className="text-green-600 dark:text-green-400 text-sm">
                +32.1%
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">
                Worst Performing Chain
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                <span>Ethereum</span>
              </div>
              <div className="text-red-600 dark:text-red-400 text-sm">
                -3.2%
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Chain Distribution</div>
            <div className="w-full h-4 flex rounded overflow-hidden">
              <div className="bg-blue-500" style={{ width: "45%" }}></div>
              <div className="bg-purple-600" style={{ width: "25%" }}></div>
              <div className="bg-green-500" style={{ width: "15%" }}></div>
              <div className="bg-blue-700" style={{ width: "10%" }}></div>
              <div className="bg-red-500" style={{ width: "5%" }}></div>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-xs">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>
                <span>ETH: 45%</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-purple-600 mr-1"></div>
                <span>MATIC: 25%</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                <span>CELO: 15%</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-blue-700 mr-1"></div>
                <span>ARB: 10%</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
                <span>AVAX: 5%</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium">Protocol Distribution</div>
            <div className="w-full h-4 flex rounded overflow-hidden">
              <div className="bg-indigo-500" style={{ width: "30%" }}></div>
              <div className="bg-cyan-500" style={{ width: "25%" }}></div>
              <div className="bg-teal-500" style={{ width: "20%" }}></div>
              <div className="bg-pink-500" style={{ width: "15%" }}></div>
              <div className="bg-amber-500" style={{ width: "10%" }}></div>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-xs">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mr-1"></div>
                <span>Aave: 30%</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-cyan-500 mr-1"></div>
                <span>Uniswap: 25%</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-teal-500 mr-1"></div>
                <span>Curve: 20%</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-pink-500 mr-1"></div>
                <span>SushiSwap: 15%</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-amber-500 mr-1"></div>
                <span>Other: 10%</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
