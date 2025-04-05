"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function GasUsage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gas Savings</CardTitle>
        <CardDescription>
          Track gas fees saved through CCIF optimization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Total Gas Fees Saved</div>
              <div className="text-2xl font-bold">$398.42</div>
            </div>
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <GasIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">
              Savings by Optimization Type
            </div>
            <div className="grid grid-cols-1 gap-2">
              <SavingsItem
                title="Cross-Chain Routing"
                amount="$182.50"
                percentage={45}
                color="bg-blue-500"
              />
              <SavingsItem
                title="Circle Paymaster Integration"
                amount="$124.38"
                percentage={31}
                color="bg-purple-600"
              />
              <SavingsItem
                title="Transaction Batching"
                amount="$69.54"
                percentage={18}
                color="bg-cyan-500"
              />
              <SavingsItem
                title="Other Optimizations"
                amount="$22.00"
                percentage={6}
                color="bg-green-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium mb-1">
              Monthly Savings Trend
            </div>
            <div className="h-[60px] w-full flex items-end justify-between gap-1">
              {[35, 28, 42, 56, 64, 75, 68, 89, 72, 94, 85, 125].map(
                (height, index) => (
                  <div
                    key={index}
                    className="h-full flex-1 flex flex-col justify-end"
                  >
                    <div
                      className="bg-gradient-to-t from-purple-600 to-blue-500 rounded-t"
                      style={{ height: `${(height / 125) * 100}%` }}
                    ></div>
                  </div>
                )
              )}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <div>Apr</div>
              <div>May</div>
              <div>Jun</div>
              <div>Jul</div>
              <div>Aug</div>
              <div>Sep</div>
              <div>Oct</div>
              <div>Nov</div>
              <div>Dec</div>
              <div>Jan</div>
              <div>Feb</div>
              <div>Mar</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SavingsItemProps {
  title: string;
  amount: string;
  percentage: number;
  color: string;
}

function SavingsItem({ title, amount, percentage, color }: SavingsItemProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <div>{title}</div>
        <div className="font-medium">{amount}</div>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="text-xs text-muted-foreground text-right">
        {percentage}%
      </div>
    </div>
  );
}

function GasIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 20V9a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M8 15h4" />
      <path d="M12 15v3a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}
