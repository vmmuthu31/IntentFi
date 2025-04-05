import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AnalyticsOverview } from "@/components/analytics/analytics-overview";
import { ChainComparison } from "@/components/analytics/chain-comparison";
import { YieldTrends } from "@/components/analytics/yield-trends";
import { GasUsage } from "@/components/analytics/gas-usage";

export const metadata = {
  title: "Analytics",
  description: "Cross-chain analytics and performance metrics",
};

export default function AnalyticsPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Cross-Chain Analytics"
        text="Analyze your portfolio performance and optimize your cross-chain strategy."
      />

      <div className="grid gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnalyticsOverview />
          <GasUsage />
        </div>

        <YieldTrends />
        <ChainComparison />
      </div>
    </DashboardShell>
  );
}
