import Link from "next/link";
// import { Button } from "@/components/ui/button";
// // import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import AnimatedTitle from "@/components/animations/animatedTile";
import TypewriterEffect from "@/components/animations/TypewriterEffect";
import Image from "next/image";
import codeSpace from "@/app/assets/codeImage.svg";
import Capability1 from "@/app/assets/capabilities1.svg";
import Capability2 from "@/app/assets/capabilities2.svg";
import Orb from "@/app/assets/orb.svg";
import Optimization from "@/app/assets/optimization.svg";
import Compliance from "@/app/assets/compliance.svg";
import FooterLogo from "@/app/assets/footerlogo.svg";
import GlitchText from "@/components/animations/glitch";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <section className="px-4 py-10 md:py-5 bg-black text-white">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center">
            {/* Left column - Text content */}
            <div className="w-full md:w-7/12 lg:w-7/12">
              <h1 className="text-7xl md:text-8xl font-light tracking-tight">
                <GlitchText text="Turn simple words" className="hover:cursor-pointer" />
                <br />
                <GlitchText text="into" className="hover:cursor-pointer" />{" "}
                <span
                  style={{ fontFamily: "InstrumentSerif" }}
                  className="text-[#FA4C15] italic"
                >
                  <TypewriterEffect text="powerful DeFi \n strategies." />
                </span>
              </h1>

              <p className="text-xl text-gray-400 mt-8 mb-10 max-w-2xl">
                IntentFi is the first AI-powered intent engine for DeFi that
                turns natural language into automated, gasless, cross-chain
                strategies.
              </p>

              <div className="flex space-x-6">
                <button className="bg-[#FA4C15] text-white px-10 py-4 rounded hover:bg-opacity-90 text-lg">
                  Launch App
                </button>
                <button className="border border-white text-white px-10 py-4 rounded hover:bg-gray-900 text-lg">
                  Verify Identity
                </button>
              </div>

              <p className="text-gray-500 mt-10 text-lg">
                No gas. No code. No limits.
              </p>
            </div>

            {/* Middle - Vertical divider */}
            <div className="hidden md:block md:h-[678px] md:mx-4 lg:mx-6">
              <div className="h-full w-0.5 radial-gradient opacity-20"></div>
            </div>

            {/* Right column - Image */}
            <div className="w-full md:w-5/12 lg:w-5/12 mt-12 md:mt-0 overflow-hidden">
              {" "}
              {/* Ensure ml-auto pushes the image right */}
              <Image
                src={codeSpace}
                alt="Code Space"
                width={1500}
                height={1500}
                className="h-auto object-contain md:object-cover"
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
            <h2
              className="text-3xl md:text-4xl font-serif text-orange-500 mb-6"
              style={{ fontFamily: "InstrumentSerif" }}
            >
              <GlitchText text="Your intent" className="text-orange-500 hover:cursor-pointer" />
            </h2>
            <div className="mb-6">
              <p className="text-gray-400 text-lg mb-0">
                &quot;Move $1,000 into low-risk DeFi that adapts weekly.&quot;
              </p>
            </div>
            <div>
              <p className="text-white text-lg">
                No wallet hopping. No spreadsheets. No guesswork. Just one
                sentence.
              </p>
            </div>
          </div>

          {/* Plus Sign 1 */}
          <div className="flex items-center justify-center md:mr-3 md:mt-28 my-8 md:my-0 opacity-50">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 5V19M5 12H19"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* AI Engine Section */}
          <div className="flex flex-col flex-1">
            <h2
              className="text-3xl md:text-4xl font-serif text-orange-500 mb-6"
              style={{ fontFamily: "InstrumentSerif" }}
            >
              Our AI engine
            </h2>
            <div className="mb-6">
              <p className="text-gray-400 text-lg mb-0">
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
          <div className="flex items-center justify-center md:mr-3 md:mt-28 my-8 md:my-0 opacity-50">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 5V19M5 12H19"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Runs & Adapts Section */}
          <div className="flex flex-col flex-1">
            <h2
              className="text-3xl md:text-4xl font-serif text-orange-500 mb-6"
              style={{ fontFamily: "InstrumentSerif" }}
            >
              It runs, adapts &amp; grows
            </h2>
            <div className="mb-6">
              <p className="text-gray-400 text-lg mb-0">
                &quot;One goal becomes a full plan that grows and adapts.&quot;
              </p>
            </div>
            <div>
              <p className="text-white text-lg">
                You set the intent. We handle the rest — live, compliant, and
                optimized.
              </p>
            </div>
          </div>
        </div>
        <div className="border-b border-gray-800 mt-16"></div>
      </div>

      {/* Use Cases Section */}
      <div className="bg-black text-white py-8 px-4">
        <div className="container mx-auto">
          {/* Heading Section */}
          <div className="text-center mb-12">
            <h2
              className="text-4xl md:text-6xl font-serif italic text-orange-500 mb-2"
              style={{ fontFamily: "InstrumentSerif" }}
            >
              Core Capabilities That
            </h2>
            <div className="flex justify-center items-center">
              <h2
                className="text-4xl md:text-6xl font-serif italic text-orange-500"
                style={{ fontFamily: "InstrumentSerif" }}
              >
                Set Us Apart
              </h2>
            </div>
            <p className="text-gray-400 mt-8 max-w-xl mx-auto text-lg text-center">
              IntentFi goes beyond basic automation — enabling yielding,
              lending, borrowing, and real strategy execution through simple
              commands.
            </p>
          </div>

          {/* Two Column Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            {/* Left Column - Intent-to-Action */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8">
              <Image
                src={Capability1}
                alt="Intent-to-Action"
                width={400}
                height={400}
                className="mb-8 w-full"
              />
              {/* Intent Title */}
              <h3
                className="text-2xl md:text-4xl font-serif text-orange-500 mb-4"
                style={{ fontFamily: "InstrumentSerif" }}
              >
                Intent-to-Action AI Engine
              </h3>

              <p className="text-gray-400 mb-4 text-lg">
                Just say what you want to do — and IntentFi turns it into a
                live, cross-chain strategy.
              </p>

              <p className="text-white text-lg">
                No need for coding, forms, or step-by-step setups. Your words
                are enough.
              </p>
            </div>

            {/* Right Column - Built-in Yielding */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8">
              <Image
                src={Capability2}
                alt="Built-in Yielding"
                width={400}
                height={400}
                className="mb-8 w-full"
              />
              {/* Intent Title */}
              <h3
                className="text-2xl md:text-4xl font-serif text-orange-500 mb-4"
                style={{ fontFamily: "InstrumentSerif" }}
              >
                Built-in Yielding, Lending & Borrowing
              </h3>

              <p className="text-gray-400 mb-4 text-lg">
                Go beyond simple swaps — build real financial strategies with
                intent.
              </p>

              <p className="text-white text-lg">
                You can lend, borrow, and farm yields across protocols using a
                single command.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-black text-white px-8 mt-0">
        <div className="container mx-auto">
          <div className="relative rounded-2xl border border-gray-800 bg-gray-900/30 p-8 overflow-visible">
            {/* Image hidden on mobile, shown on md+ */}
            <div className="hidden md:block absolute -top-32 right-8">
              <Image
                src={Orb}
                alt="Orb"
                width={600}
                height={600}
                className="object-contain"
              />
            </div>

            <div className="flex flex-col md:flex-row items-end justify-between mt-8 md:mt-8 md:py-10">
              {/* Text on the left bottom */}
              <div className="max-w-md">
                <div
                  className="text-2xl md:text-4xl font-serif text-orange-500 mb-4"
                  style={{ fontFamily: "InstrumentSerif" }}
                >
                  Gasless, Compliant, and Cross-Chain
                </div>
                <div className="text-gray-400 mb-4 text-base">
                  No wallet switching. No bridging. No repeated KYC prompts.
                </div>
                <div className="text-white text-lg">
                  IntentFi handles it all — gas-free, permissionless, and
                  private from day one.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Optimization Section */}
      <div className="bg-black text-white py-0 px-4">
        <div className="container mx-auto">
          {/* Two Column Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            {/* Left Column - Always-On Optimization */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8 relative">
              <Image
                src={Optimization}
                alt="Optimization"
                width={400}
                height={400}
                className="mb-8 w-full object-contain"
              />
              <h3
                className="text-2xl md:text-4xl font-serif text-orange-500 mb-4"
                style={{ fontFamily: "InstrumentSerif" }}
              >
                Always-On Optimization
              </h3>

              <p className="text-gray-400 mb-4 text-lg">
                Your deployed strategies stay smart and in sync with the market.
              </p>

              <p className="text-white text-lg">
                IntentFi constantly checks for better APYs, risk scores, and gas
                routes — and updates automatically.
              </p>
            </div>

            {/* Right Column - One-Time KYC */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8 relative">
              {/* Background Image */}
              <Image
                src={Compliance}
                alt="Compliance"
                width={400}
                height={400}
                className="absolute top-0 left-0 w-full h-full z-0"
              />

              {/* Text Content */}
              <div className="relative z-10 top-[375px]">
                <h3
                  className="text-2xl md:text-4xl font-serif text-orange-500 mb-4"
                  style={{ fontFamily: "InstrumentSerif" }}
                >
                  One-Time KYC. Full Compliance.
                </h3>

                <p className="text-gray-400 mb-4 text-lg">
                  Craft strategies with clicks or schedule them for your future
                  self.
                </p>

                <p className="text-white text-lg">
                  Build drag-and-drop logic or say things like “Stake next
                  Friday if ETH dips below $2k.”
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-800 mt-5"></div>

      <div className="container mx-auto mt-20">
        {/* Heading Section */}
        <div className="text-center mb-12">
          <h2
            className="text-4xl md:text-6xl font-serif italic text-orange-500 mb-2"
            style={{ fontFamily: "InstrumentSerif" }}
          >
            Use Cases &
          </h2>
          <div className="flex justify-center items-center">
            <h2
              className="text-4xl md:text-6xl font-serif italic text-orange-500"
              style={{ fontFamily: "InstrumentSerif" }}
            >
              Intents in Action
            </h2>
          </div>
          <p className="text-gray-400 mt-8 max-w-xl mx-auto text-center text-lg">
            From simple prompts to powerful strategies — see how real users
            automate DeFi with just one command.
          </p>
        </div>

        {/* Two Column Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
          {/* Left Column - Intent-to-Action */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8">
            <div
              className="text-2xl md:text-3xl font-serif text-orange-500 mb-4"
              style={{ fontFamily: "InstrumentSerif" }}
            >
              01.
            </div>
            {/* Intent Title */}
            <h3
              className="text-2xl md:text-3xl font-serif text-orange-500 mb-4"
              style={{ fontFamily: "InstrumentSerif" }}
            >
              DeFi Explorer
            </h3>

            <ul className="text-white text-lg list-none">
              <li className="">
                <span className="text-xl">→</span>
                “Move my USDC to the highest APY vault”
              </li>
              <li className="">
                <span className="text-xl">→</span>
                IntentFi scans top protocols, bridges funds, and autostakes via
                Beefy or Aave.
              </li>
              <li className="">
                <span className="text-xl">→</span>
                7.2% APY auto-compounding on Polygon — no gas, no switching
                wallets.
              </li>
            </ul>
          </div>

          {/* Right Column - Built-in Yielding */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8">
            <div
              className="text-2xl md:text-3xl font-serif text-orange-500 mb-4"
              style={{ fontFamily: "InstrumentSerif" }}
            >
              02.
            </div>
            {/* Intent Title */}
            <h3
              className="text-2xl md:text-3xl font-serif text-orange-500 mb-4"
              style={{ fontFamily: "InstrumentSerif" }}
            >
              Investor
            </h3>

            <ul className="text-white text-lg list-none">
              <li className="">
                <span className="text-xl">→</span>
                “Move my USDC to the highest APY vault”
              </li>
              <li className="">
                <span className="text-xl">→</span>
                IntentFi monitors RSI, triggers swaps via 1inch, and schedules
                weekly execution.
              </li>
              <li className="">
                <span className="text-xl">→</span>
                Automated DCA strategy — executed gaslessly across chains every
                week.
              </li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          {/* Left Column - Intent-to-Action */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8">
            <div
              className="text-2xl md:text-3xl font-serif text-orange-500 mb-4"
              style={{ fontFamily: "InstrumentSerif" }}
            >
              03.
            </div>
            {/* Intent Title */}
            <h3
              className="text-2xl md:text-3xl font-serif text-orange-500 mb-4"
              style={{ fontFamily: "InstrumentSerif" }}
            >
              Portfolio Manager
            </h3>

            <ul className="text-white text-lg list-none">
              <li className="">
                <span className="text-xl">→</span>
                “Rebalance to 40% coins, 30% BTC, 30% DeFi tokens”
              </li>
              <li className="">
                <span className="text-xl">→</span>
                AI calculates asset split, bridges across chains, and deploys
                into safe protocols.
              </li>
              <li className="">
                <span className="text-xl">→</span>
                Diversified multi-chain portfolio built and rebalanced without
                manual effort.
              </li>
            </ul>
          </div>

          {/* Right Column - Built-in Yielding */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8">
            <div
              className="text-2xl md:text-3xl font-serif text-orange-500 mb-4"
              style={{ fontFamily: "InstrumentSerif" }}
            >
              04.
            </div>
            {/* Intent Title */}
            <h3
              className="text-2xl md:text-3xl font-serif text-orange-500 mb-4"
              style={{ fontFamily: "InstrumentSerif" }}
            >
              DAO Treasury Lead
            </h3>

            <ul className="text-white text-lg list-none">
              <li className="">
                <span className="text-xl">→</span>
                “Stake idle treasury assets with risk score under 3%”
              </li>
              <li className="">
                <span className="text-xl">→</span>
                IntentFi filters protocols by risk and APY, then allocates
                treasury funds safely.
              </li>
              <li className="">
                <span className="text-xl">→</span>
                Idle DAO funds now earning low-risk yield — with full on-chain
                transparency
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}

      <div className="border-b border-gray-800 mt-20"></div>

      <footer className="mb-10 rounded-b-2xl bg-background">
        <div className="flex flex-col md:flex-row gap-8 justify-around text-white pt-12 px-4">
          <div className="flex-1">
            <Image
              src={FooterLogo}
              alt="Footer Logo"
              width={400}
              height={400}
              className="mx-auto mt-8"
            />
          </div>
          <div className="flex-1">
            <div
              style={{ fontFamily: 'InstrumentSerif' }}
              className="text-center md:text-9xl text-4xl italic"
            >
              IntentFi
            </div>
            <p className="text-xl text-center md:pl-12 pl-4">Your strategy starts with a sentence.</p>

            <div className="flex justify-center mt-8 space-x-8 md:space-x-16">
              <div className="flex flex-col space-y-4 text-center md:text-right">
                <div>SOCIALS</div>
                <div className="hover:cursor-pointer">Telegram</div>
                <div className="hover:cursor-pointer">Twitter (X)</div>
              </div>
              <div className="flex flex-col space-y-4 text-center md:text-right">
                <div>NAVIGATION</div>
                <Link href={'/intent'} className="hover:cursor-pointer">
                  Intent
                </Link>
                <Link href={'/identity'} className="hover:cursor-pointer">
                  Identity
                </Link>
                <Link href={'/analytics'} className="hover:cursor-pointer">
                  Analytics
                </Link>
                <Link href={'/dashboard'} className="hover:cursor-pointer">
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="border-b-2 border-gray-800 border-dotted mt-12"></div>
        <div className="flex flex-col md:flex-row justify-center items-center my-4 space-y-4 md:space-x-8 md:space-y-0">
          <div className="hover:cursor-pointer">Privacy Policy</div>
          <div className="hover:cursor-pointer">Terms of Service</div>
          <div className="hover:cursor-pointer">Risk Disclaimer</div>
          <div className="hover:cursor-pointer">©2025 INTENTFI™ // ALL RIGHTS RESERVED</div>
        </div>
      </footer>
    </div>
  );
}