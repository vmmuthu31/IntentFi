import Link from "next/link";
import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import AnimatedTitle from "@/components/animations/animatedTile";
// import TypewriterEffect from "@/components/animations/TypewriterEffect";
import Image from "next/image";
import codeSpace from "@/app/assets/codeImage.svg"
// import Capability1 from "@/app/assets/capabilities1.svg"
// import Capability2 from "@/app/assets/capabilities2.svg"


export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <section className="px-4 py-10 md:py-5 bg-black text-white">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            {/* Left column - Text content (increased width) */}
            <div className="w-full md:w-7/12 lg:w-7/12">
              <h1 className="text-7xl md:text-7xl font-light leading-tight">
                Turn simple words 
                <br />
                into <span className="text-[#FA4C15] italic">powerful DeFi
                <br />
                strategies.</span>
              </h1>
              
              <p className="text-xl text-gray-400 mt-8 mb-10 max-w-2xl">
                IntentFi is the first AI-powered intent engine for DeFi that turns
                natural language into automated, gasless, cross-chain strategies.
              </p>
              
              <div className="flex space-x-6">
                <button className="bg-[#FA4C15] text-white px-10 py-4 rounded hover:bg-opacity-90 text-lg">
                  Launch App
                </button>
                <button className="border border-white text-white px-10 py-4 rounded hover:bg-gray-900 text-lg">
                  Verify Identity
                </button>
              </div>
              
              <p className="text-gray-500 mt-10 text-lg">No gas. No code. No limits.</p>
            </div>
            
            {/* Middle - Vertical divider */}
            <div className="hidden md:block md:h-[678px] md:mx-4 lg:mx-6">
              <div className="h-full w-0.5 radial-gradient opacity-20"></div>
            </div>
            
            {/* Right column - Image (decreased width) */}
            <div className="w-full md:w-4/12 lg:w-4/12 mt-12 md:mt-0">
              <Image
                src={codeSpace}
                alt="Code Space"
                className="w-full max-w-md mx-auto md:max-w-full"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <div className="bg-black text-white py-16 px-4">
      <div className="container mx-auto flex flex-col md:flex-row items-start justify-between gap-4">
        {/* Intent Section */}
        <div className="flex flex-col flex-1">
          <h2 className="text-3xl md:text-4xl font-serif text-orange-500 mb-6">Your intent</h2>
          <div className="mb-6">
            <p className="text-gray-400 text-lg mb-2">
              &quot;Move $1,000 into low-risk DeFi that adapts weekly.&quot;
            </p>
          </div>
          <div>
            <p className="text-white text-lg">
              No wallet hopping. No spreadsheets. No guesswork. Just one sentence.
            </p>
          </div>
        </div>

        {/* Plus Sign 1 */}
        <div className="flex items-center justify-center md:mt-16 my-8 md:my-0">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* AI Engine Section */}
        <div className="flex flex-col flex-1">
          <h2 className="text-3xl md:text-4xl font-serif text-orange-500 mb-6">Our AI engine</h2>
          <div className="mb-6">
            <p className="text-gray-400 text-lg mb-2">
              Executed via Circle CCTP, 1inch, and Zircuit — gas-free.
            </p>
          </div>
          <div>
            <p className="text-white text-lg">
              No approvals. No gas anxiety. No breaking flows. It just works.
            </p>
          </div>
        </div>

        {/* Plus Sign 2 */}
        <div className="flex items-center justify-center md:mt-16 my-8 md:my-0">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Runs & Adapts Section */}
        <div className="flex flex-col flex-1">
          <h2 className="text-3xl md:text-4xl font-serif text-orange-500 mb-6">It runs, adapts &amp; grows</h2>
          <div className="mb-6">
            <p className="text-gray-400 text-lg mb-2">
            &quot;One goal becomes a full plan that grows and adapts.&quot;
            </p>
          </div>
          <div>
            <p className="text-white text-lg">
              You set the intent. We handle the rest — live, compliant, and optimized.
            </p>
          </div>
        </div>
      </div>
      <div className="border-b border-gray-800 mt-16"></div>
    </div>

      {/* Use Cases Section */}
      <div className="bg-black text-white py-16 px-4">
      <div className="container mx-auto">
        {/* Heading Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-serif italic text-orange-500 mb-2">
            Core Capabilities That
          </h2>
          <div className="flex justify-center items-center">
            <h2 className="text-4xl md:text-5xl font-serif italic text-orange-500">
              Set Us Apart
            </h2>
          </div>
          <p className="text-gray-400 mt-8 max-w-3xl mx-auto text-center text-lg">
            IntentFi goes beyond basic automation — enabling yielding, lending, 
            borrowing, and real strategy execution through simple commands.
          </p>
        </div>

        {/* Two Column Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
          {/* Left Column - Intent-to-Action */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8">
            <div className="min-h-64 mb-8">
              {/* Example Command */}
              <div className="bg-gray-950 rounded-xl p-4 mb-8 w-fit mx-auto md:mx-0 md:ml-auto">
                <p className="text-white">
                  &quote;Rebalance my portfolio to 60% stablecoins.&quote;
                </p>
              </div>

              {/* Processing Steps */}
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="mr-3 mt-1">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z" fill="#F05E23" />
                    </svg>
                  </div>
                  <p className="text-gray-400">Understanding...</p>
                </div>
                <div className="flex items-start">
                  <div className="mr-3 mt-1">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z" fill="#F05E23" />
                    </svg>
                  </div>
                  <p className="text-gray-400">Scanning yield protocols...</p>
                </div>
                <div className="flex items-start">
                  <div className="mr-3 mt-1">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z" fill="#F05E23" />
                    </svg>
                  </div>
                  <p className="text-gray-400">Generating strategy...</p>
                </div>
              </div>
            </div>

            {/* Intent Title */}
            <h3 className="text-2xl md:text-3xl font-serif text-orange-500 mb-4">
              Intent-to-Action AI Engine
            </h3>
            
            <p className="text-gray-400 mb-4">
              Just say what you want to do — and IntentFi turns it into a live, 
              cross-chain strategy.
            </p>
            
            <p className="text-white">
              No need for coding, forms, or step-by-step setups. Your words 
              are enough.
            </p>
          </div>

          {/* Right Column - Built-in Yielding */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8">
            <div className="min-h-64 mb-8">
              {/* Example Command */}
              <div className="bg-gray-950 rounded-xl p-4 mb-6 w-fit mx-auto md:mx-0 md:ml-auto">
                <p className="text-white">
                  &quote;Grow my $1,000 in DeFi.&quote;
                </p>
              </div>

              {/* Strategy Results */}
              <div className="space-y-6">
                <div className="flex items-start mb-2">
                  <div className="mr-3 mt-1">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z" fill="#F05E23" />
                    </svg>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg w-full">
                    <p className="font-medium text-white">Yield Farming</p>
                    <p className="text-gray-400">→ 7.2% APY via Beefy on Polygon</p>
                    <p className="text-gray-400">→ Auto-compounding enabled</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mr-3 mt-1">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z" fill="#F05E23" />
                    </svg>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-lg w-full">
                    <p className="font-medium text-white">Lending</p>
                    <p className="text-gray-400">→ Lending USDC via Aave v3</p>
                    <p className="text-gray-400">→ Weekly interest snapshot</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Intent Title */}
            <h3 className="text-2xl md:text-3xl font-serif text-orange-500 mb-4">
              Built-in Yielding, Lending & Borrowing
            </h3>
            
            <p className="text-gray-400 mb-4">
              Go beyond simple swaps — build real financial strategies with
              intent.
            </p>
            
            <p className="text-white">
              You can lend, borrow, and farm yields across protocols using a
              single command.
            </p>
          </div>
        </div>
      </div>
    </div>

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
