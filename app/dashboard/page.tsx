import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PortfolioOverview } from "@/components/dashboard/portfolio-overview";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { CrossChainOpportunities } from "@/components/dashboard/cross-chain-opportunities";

export const metadata = {
  title: "Dashboard",
  description: "Monitor your portfolio and discover cross-chain opportunities.",
};

export default function DashboardPage() {
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
                Dashboard
              </span>
            </h1>
            <p className="text-xl text-gray-400 mt-6 mb-8 max-w-2xl mx-auto">
              Monitor your cross-chain assets and discover new opportunities.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8 overflow-hidden">
            <Tabs defaultValue="overview" className="space-y-4">
              <div className="flex justify-center w-full">
                <TabsList className="justify-center bg-gray-800/50 mb-4 rounded-xl p-1 gap-2 border border-gray-700">
                  <TabsTrigger 
                    value="overview"
                    className="data-[state=active]:bg-[#FA4C15] data-[state=active]:text-white rounded-lg text-gray-300"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analytics"
                    className="data-[state=active]:bg-[#FA4C15] data-[state=active]:text-white rounded-lg text-gray-300"
                  >
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger 
                    value="intents"
                    className="data-[state=active]:bg-[#FA4C15] data-[state=active]:text-white rounded-lg text-gray-300"
                  >
                    Active Intents
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Value
                      </CardTitle>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="h-4 w-4 text-muted-foreground"
                      >
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">$45,231.89</div>
                      <p className="text-xs text-muted-foreground">
                        +20.1% from last month
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Active Chains
                      </CardTitle>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="h-4 w-4 text-muted-foreground"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">5</div>
                      <p className="text-xs text-muted-foreground">
                        Ethereum, Polygon, Celo, Avalanche, Arbitrum
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Current Yield
                      </CardTitle>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="h-4 w-4 text-muted-foreground"
                      >
                        <rect width="20" height="14" x="2" y="5" rx="2" />
                        <path d="M2 10h20" />
                      </svg>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">7.2%</div>
                      <p className="text-xs text-muted-foreground">
                        +1.2% from last week
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Active Intents
                      </CardTitle>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="h-4 w-4 text-muted-foreground"
                      >
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">3</div>
                      <p className="text-xs text-muted-foreground">
                        2 automated, 1 pending approval
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                  <PortfolioOverview className="col-span-4" />
                  <CrossChainOpportunities className="col-span-3" />
                </div>

                <RecentTransactions />
              </TabsContent>

              <TabsContent value="analytics" className="flex flex-col space-y-4">
                <Card className="border-gray-800 bg-gray-900/30">
                  <CardHeader>
                    <CardTitle>Analytics</CardTitle>
                    <CardDescription>
                      Detailed insights about your cross-chain portfolio
                      performance.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px] flex items-center justify-center">
                    <div className="text-muted-foreground">
                      Analytics data will appear here soon
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="intents" className="flex flex-col space-y-4">
                <Card className="border-gray-800 bg-gray-900/30">
                  <CardHeader>
                    <CardTitle>Active Intents</CardTitle>
                    <CardDescription>
                      Monitor and manage your currently active financial intents.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px] flex items-center justify-center">
                    <div className="text-muted-foreground">
                      Active intents will appear here soon
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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
