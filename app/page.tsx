import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: "🎯",
    title: "Intent-Driven DeFi Autopilot",
    description:
      "Move beyond one-time transactions to condition-based, automated financial strategies that work across chains.",
  },
  {
    icon: "📊",
    title: "AI-Powered Opportunity Surfacing",
    description:
      "Our system continuously analyzes opportunities across all major blockchains, suggesting optimal strategies based on your goals.",
  },
  {
    icon: "🔒",
    title: "Privacy-Preserving Compliance",
    description:
      "Verify your identity once and maintain compliant access across all connected chains without repeatedly sharing personal data.",
  },
  {
    icon: "⚡",
    title: "Zero Gas Experience",
    description:
      "We eliminate the friction of gas fees through Circle Paymaster integration, allowing you to focus on your financial goals.",
  },
];

const useCases = [
  {
    title: "The DeFi Enthusiast",
    intent: "I want to earn the highest yield on my USDC across all chains",
    description:
      "IntentFI automatically moves funds to the highest-yielding opportunities, adjusting as market conditions change.",
  },
  {
    title: "The Crypto Investor",
    intent: "Convert 50% of my Bitcoin to a diversified DeFi portfolio",
    description:
      "IntentFI handles the cross-chain complexity, selecting optimal routes and protocols.",
  },
  {
    title: "The Institutional Treasury",
    intent:
      "Maintain a balanced portfolio that's 40% stablecoins, 30% blue-chip crypto, and 30% yield-generating positions",
    description:
      "IntentFI automatically rebalances across chains as asset values fluctuate.",
  },
  {
    title: "The Recurring Investor",
    intent:
      "Invest $200 in ETH every Friday, but only when the RSI is below 40",
    description:
      "IntentFI creates conditional automated investment strategies.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="px-4 py-20 md:py-32 bg-gradient-to-br from-gray-50 via-neutral-100 to-gray-100 dark:from-gray-950 dark:via-neutral-900 dark:to-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="flex-1 space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                <span className="block">Cross-Chain</span>
                <span className="block bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
                  Intent Finance
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-xl">
                Express financial goals in natural language. We&apos;ll execute
                them across chains.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 text-white"
                >
                  <Link href="/dashboard">Launch App</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/identity">Verify Identity</Link>
                </Button>
              </div>
            </div>
            <div className="flex-1 flex justify-center md:justify-end">
              <div className="relative w-full max-w-md h-[320px] md:h-[360px] bg-gradient-to-br from-purple-600/10 via-blue-500/10 to-cyan-400/10 dark:from-purple-600/20 dark:via-blue-500/20 dark:to-cyan-400/20 rounded-xl p-1">
                <div className="w-full h-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative">
                  <div className="absolute top-5 left-5 text-xl">💬</div>
                  <div className="absolute top-5 right-5 flex space-x-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex flex-col h-full pt-12 px-5 pb-4">
                    <div className="flex-1 space-y-2">
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg rounded-tl-none max-w-xs text-sm">
                        I want to earn the highest yield on my USDC across all
                        chains
                      </div>
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg rounded-tr-none max-w-xs ml-auto text-sm">
                        Finding the highest yields across 8 blockchains...
                      </div>
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg rounded-tr-none max-w-xs ml-auto text-sm">
                        Found! Polygon offers 7.2% APY on USDC via Aave. Moving
                        1000 USDC from Ethereum to Polygon...
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg rounded-tl-none max-w-xs text-sm">
                        Great! Notify me if better rates become available.
                      </div>
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg rounded-tr-none max-w-xs ml-auto text-sm">
                        Will do! I&apos;ll monitor rates across all chains and
                        notify you of better opportunities.
                      </div>
                    </div>
                    <div className="relative mt-4">
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-full bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Tell IntentFI what you want to achieve..."
                        disabled
                      />
                      <Button
                        size="sm"
                        className="absolute right-1 top-1 rounded-full px-3 py-1 bg-blue-500 hover:bg-blue-600"
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white dark:bg-black">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Key Innovations
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
              Transforming how users interact with decentralized finance across
              multiple blockchains.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="overflow-hidden border border-gray-200 dark:border-gray-800 transition-all duration-300 hover:shadow-lg dark:hover:shadow-purple-900/10 hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="text-4xl mb-2">{feature.icon}</div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Use Cases That Showcase Our Value
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
              Real-world examples of how IntentFI transforms the DeFi
              experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {useCases.map((useCase, index) => (
              <Card
                key={index}
                className="overflow-hidden border border-gray-200 dark:border-gray-800 transition-all duration-300 hover:shadow-lg dark:hover:shadow-purple-900/10"
              >
                <CardHeader>
                  <CardTitle>{useCase.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg rounded-tl-none text-sm">
                    &quot;{useCase.intent}&quot;
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    {useCase.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 text-white"
            >
              <Link href="/intent">Try Intent Interface</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-20 px-4 bg-white dark:bg-black">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powered By Cutting-Edge Technology
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
              We integrate the best-in-class blockchain infrastructure.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            {[
              "Hyperlane",
              "1inch",
              "Circle",
              "Self Protocol",
              "Zircuit",
              "MultiBaas",
            ].map((tech, index) => (
              <div
                key={index}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm md:text-base font-medium"
              >
                {tech}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-600 via-blue-500 to-cyan-400 text-white">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to transform your DeFi experience?
          </h2>
          <p className="text-xl mb-8 max-w-xl mx-auto">
            Join us in building the financial operating system of the future.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="bg-white text-blue-600 hover:bg-gray-100"
          >
            <Link href="/dashboard">Launch App</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-gray-400">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="text-xl font-bold text-white">IntentFI</div>
              <div className="text-sm">Cross-Chain Intent Finance</div>
            </div>
            <div className="flex space-x-6">
              <Link href="#" className="hover:text-white transition-colors">
                Twitter
              </Link>
              <Link href="#" className="hover:text-white transition-colors">
                GitHub
              </Link>
              <Link href="#" className="hover:text-white transition-colors">
                Docs
              </Link>
              <Link href="#" className="hover:text-white transition-colors">
                Contact
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-gray-800 text-center text-sm">
            © 2025 IntentFI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
