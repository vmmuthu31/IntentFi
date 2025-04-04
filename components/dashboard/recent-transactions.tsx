"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function RecentTransactions() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Your recent cross-chain transactions and intents
          </CardDescription>
        </div>
        <Button variant="outline" size="sm">
          View All
        </Button>
      </CardHeader>
      <CardContent className="grid gap-8">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_100px] gap-4 text-sm font-medium">
          <div>Transaction</div>
          <div>From</div>
          <div>To</div>
          <div>Date</div>
          <div className="text-right">Status</div>
        </div>
        <div className="grid gap-4">
          <Transaction
            name="USDC Transfer"
            from="Ethereum"
            to="Polygon"
            date="5 minutes ago"
            status="Completed"
            amount="1,000 USDC"
            intent="Maximize Yield"
          />
          <Transaction
            name="ETH Swap"
            from="Ethereum"
            to="Celo"
            date="2 hours ago"
            status="Completed"
            amount="0.5 ETH"
            intent="Stake on Celo"
          />
          <Transaction
            name="Liquidity Provision"
            from="BTC"
            to="Arbitrum"
            date="6 hours ago"
            status="Pending"
            amount="0.15 BTC"
            intent="Provide Liquidity"
          />
          <Transaction
            name="Weekly DCA"
            from="USDC"
            to="Avalanche"
            date="Yesterday"
            status="Completed"
            amount="200 USDC"
            intent="Buy AVAX Weekly"
          />
          <Transaction
            name="Yield Harvesting"
            from="Polygon"
            to="Ethereum"
            date="2 days ago"
            status="Completed"
            amount="250 MATIC"
            intent="Take Profits"
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface TransactionProps {
  name: string;
  from: string;
  to: string;
  date: string;
  status: "Pending" | "Completed" | "Failed";
  amount: string;
  intent: string;
}

function Transaction({
  name,
  from,
  to,
  date,
  status,
  amount,
}: TransactionProps) {
  const fromChainColor =
    {
      Ethereum: "bg-blue-500",
      Polygon: "bg-purple-600",
      Celo: "bg-green-500",
      Arbitrum: "bg-blue-700",
      Avalanche: "bg-red-500",
      BTC: "bg-orange-500",
      USDC: "bg-blue-400",
    }[from] || "bg-gray-500";

  const toChainColor =
    {
      Ethereum: "bg-blue-500",
      Polygon: "bg-purple-600",
      Celo: "bg-green-500",
      Arbitrum: "bg-blue-700",
      Avalanche: "bg-red-500",
      BTC: "bg-orange-500",
      USDC: "bg-blue-400",
    }[to] || "bg-gray-500";

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_100px] gap-4 items-center rounded-lg p-3 hover:bg-accent/50 transition-colors">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{amount}</div>
      </div>
      <div className="flex items-center space-x-1.5">
        <div className={`h-2 w-2 rounded-full ${fromChainColor}`} />
        <span className="text-sm">{from}</span>
      </div>
      <div className="flex items-center space-x-1.5">
        <div className={`h-2 w-2 rounded-full ${toChainColor}`} />
        <span className="text-sm">{to}</span>
      </div>
      <div className="text-sm text-muted-foreground">{date}</div>
      <div className="text-right">
        <StatusBadge status={status} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: TransactionProps["status"] }) {
  const color = {
    Pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500",
    Completed:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500",
    Failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500",
  }[status];

  return (
    <div
      className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${color}`}
    >
      {status}
    </div>
  );
}
