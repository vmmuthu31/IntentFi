"use client";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AnalyticsOverview } from "@/components/analytics/analytics-overview";
import { ChainComparison } from "@/components/analytics/chain-comparison";
import { YieldTrends } from "@/components/analytics/yield-trends";
import { GasUsage } from "@/components/analytics/gas-usage";

// export const metadata = {
//   title: "Analytics",
//   description: "Cross-chain analytics and performance metrics",
// };

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <section className="px-4 py-10 md:py-12">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-7xl font-light tracking-tight mb-4">
              Cross-Chain
              <br />
              <span
                style={{ fontFamily: "InstrumentSerif" }}
                className="text-[#FA4C15] italic"
              >
                Analytics
              </span>
            </h1>
            <p className="text-xl text-gray-400 mt-6 mb-8 max-w-2xl mx-auto">
              Analyze your portfolio performance and optimize your cross-chain strategy.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8 overflow-hidden">
            <div className="grid gap-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnalyticsOverview />
                <GasUsage />
              </div>

              <YieldTrends />
              <ChainComparison />
            </div>
          </div>
        </div>
      </section>

      <div className="border-b border-gray-800 mt-12"></div>

      <footer className="py-8 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <p className="text-gray-500">
            Need help? Visit our{" "}
            <a href="#" className="text-[#FA4C15] hover:underline">
              documentation
            </a>{" "}
            or{" "}
            <a href="#" className="text-[#FA4C15] hover:underline">
              contact support
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
