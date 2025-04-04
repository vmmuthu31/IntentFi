"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>Intent History</CardTitle>
        <CardDescription>
          Monitor and manage your active and completed intents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active Intents</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <div className="grid gap-4">
              {activeIntents.map((intent) => (
                <ActiveIntentCard key={intent.id} intent={intent} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <div className="grid gap-4">
              {completedIntents.map((intent) => (
                <CompletedIntentCard key={intent.id} intent={intent} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
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
    <div className="rounded-lg border p-4 transition-colors hover:bg-accent/50">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{intent.name}</h3>
          <p className="text-sm text-muted-foreground">{intent.description}</p>
        </div>
        <div className="flex items-center">
          <div className="mr-2 h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm">Active</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1">
        {intent.chains.map((chain) => (
          <div
            key={chain}
            className="px-2 py-1 text-xs rounded-full bg-accent text-accent-foreground"
          >
            {chain}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Last Execution</div>
          <div>{intent.lastExecution}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Performance</div>
          <div className="font-medium text-green-600 dark:text-green-400">
            {intent.performance}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end space-x-2">
        <Button variant="outline" size="sm">
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
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
    <div className="rounded-lg border p-4 transition-colors hover:bg-accent/50">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{intent.name}</h3>
          <p className="text-sm text-muted-foreground">{intent.description}</p>
        </div>
        <div className="flex items-center">
          <div className="mr-2 h-2 w-2 rounded-full bg-gray-400" />
          <span className="text-sm">Completed</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1">
        {intent.chains.map((chain) => (
          <div
            key={chain}
            className="px-2 py-1 text-xs rounded-full bg-accent text-accent-foreground"
          >
            {chain}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Execution Date</div>
          <div>{intent.executionDate}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Result</div>
          <div className="font-medium text-green-600 dark:text-green-400">
            {intent.performance}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end space-x-2">
        <Button variant="outline" size="sm">
          Details
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-primary hover:text-primary-hover"
        >
          Reactivate
        </Button>
      </div>
    </div>
  );
}
