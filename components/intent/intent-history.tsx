"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const activeIntents = [
  {
    id: "intent-1",
    name: "USDC Yield Optimization",
    description: "Automatically maximize yield on my USDC across all chains",
    status: "active",
    lastExecution: "5 minutes ago",
    chains: ["Ethereum", "Polygon", "Celo"],
    performance: "+7.2% APY",
  },
  {
    id: "intent-2",
    name: "Weekly DCA into ETH",
    description: "Invest $200 in ETH every Friday when RSI < 40",
    status: "active",
    lastExecution: "6 days ago",
    chains: ["Ethereum"],
    performance: "-3.1% (awaiting market dip)",
  },
  {
    id: "intent-3",
    name: "Portfolio Rebalancing",
    description: "Maintain 40% stables, 30% blue-chips, 30% yield assets",
    status: "active",
    lastExecution: "2 days ago",
    chains: ["Ethereum", "Polygon", "Arbitrum", "Avalanche"],
    performance: "+12.4% overall",
  },
];

const completedIntents = [
  {
    id: "intent-4",
    name: "Bitcoin Diversification",
    description: "Convert 50% BTC to diversified portfolio",
    status: "completed",
    executionDate: "April 1, 2025",
    chains: ["Bitcoin", "Ethereum", "Polygon", "Avalanche", "Celo"],
    performance: "+4.8% since execution",
  },
  {
    id: "intent-5",
    name: "Gas Fee Optimization",
    description: "Move assets from Ethereum to Polygon",
    status: "completed",
    executionDate: "March 28, 2025",
    chains: ["Ethereum", "Polygon"],
    performance: "Saved $125 in gas fees",
  },
];

export function IntentHistory() {
  return (
    <div>
      <Tabs defaultValue="active">
        <TabsList className="bg-gray-800/50 mb-8 rounded-xl p-1 gap-2 border border-gray-700">
          <TabsTrigger
            value="active"
            className="data-[state=active]:bg-[#FA4C15] data-[state=active]:text-white rounded-lg text-gray-300"
          >
            Active Intents
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="data-[state=active]:bg-[#FA4C15] data-[state=active]:text-white rounded-lg text-gray-300"
          >
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          <div className="grid gap-6">
            {activeIntents.map((intent) => (
              <ActiveIntentCard key={intent.id} intent={intent} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          <div className="grid gap-6">
            {completedIntents.map((intent) => (
              <CompletedIntentCard key={intent.id} intent={intent} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ActiveIntentProps {
  intent: {
    id: string;
    name: string;
    description: string;
    status: string;
    lastExecution: string;
    chains: string[];
    performance: string;
  };
}

function ActiveIntentCard({ intent }: ActiveIntentProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-6 transition-all hover:bg-gray-800/50 hover:border-gray-700">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl text-white font-medium">{intent.name}</h3>
          <p className="text-gray-400 mt-1">{intent.description}</p>
        </div>
        <div className="flex items-center">
          <div className="mr-2 h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-400 text-sm font-medium">Live</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {intent.chains.map((chain) => (
          <div
            key={chain}
            className="px-3 py-1 text-xs rounded-full bg-gray-800 text-gray-300 border border-gray-700"
          >
            {chain}
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-gray-500 text-sm">Last Execution</div>
          <div className="text-gray-300 mt-1">{intent.lastExecution}</div>
        </div>
        <div>
          <div className="text-gray-500 text-sm">Performance</div>
          <div
            className={`font-medium mt-1 ${
              intent.performance.includes("-")
                ? "text-red-400"
                : "text-green-400"
            }`}
          >
            {intent.performance}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <Button
          variant="outline"
          className="border border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800"
        >
          Edit
        </Button>
        <Button
          variant="outline"
          className="border border-red-900/50 bg-transparent text-red-400 hover:bg-red-900/20"
        >
          Pause
        </Button>
      </div>
    </div>
  );
}

interface CompletedIntentProps {
  intent: {
    id: string;
    name: string;
    description: string;
    status: string;
    executionDate: string;
    chains: string[];
    performance: string;
  };
}

function CompletedIntentCard({ intent }: CompletedIntentProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-6 transition-all hover:bg-gray-800/50 hover:border-gray-700">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl text-white font-medium">{intent.name}</h3>
          <p className="text-gray-400 mt-1">{intent.description}</p>
        </div>
        <div className="flex items-center">
          <div className="mr-2 h-2.5 w-2.5 rounded-full bg-gray-400" />
          <span className="text-gray-400 text-sm font-medium">Completed</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {intent.chains.map((chain) => (
          <div
            key={chain}
            className="px-3 py-1 text-xs rounded-full bg-gray-800 text-gray-300 border border-gray-700"
          >
            {chain}
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-gray-500 text-sm">Execution Date</div>
          <div className="text-gray-300 mt-1">{intent.executionDate}</div>
        </div>
        <div>
          <div className="text-gray-500 text-sm">Result</div>
          <div className="font-medium mt-1 text-green-400">
            {intent.performance}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <Button
          variant="outline"
          className="border border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800"
        >
          Details
        </Button>
        <Button
          variant="outline"
          className="border border-[#FA4C15]/30 bg-transparent text-[#FA4C15] hover:bg-[#FA4C15]/10"
        >
          Reactivate
        </Button>
      </div>
    </div>
  );
}
