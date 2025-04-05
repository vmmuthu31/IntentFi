"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { SelfAppBuilder } from "@selfxyz/qrcode";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import WalletConnect from "@/components/ui/WalletConnect";

const SelfQRcodeWrapper = dynamic(
  () => import("@selfxyz/qrcode").then((mod) => mod.default),
  { ssr: false }
);

export default function VerifyPage() {
  const { address, isConnected } = useAccount();
  const [verificationStatus, setVerificationStatus] = useState("notStarted");
  const [loading, setLoading] = useState(false);

  const identityVerifierAddress = "0x792620B1F97608c9AE93E0f823F40f47Dd7E20D3";

  const selfApp = React.useMemo(() => {
    if (!address) return null;

    return new SelfAppBuilder({
      appName: "IntentFi",
      scope: "5949212",
      endpoint: "https://intentfi.vercel.app/api/verify",
      endpointType: "staging_https",
      logoBase64: "https://i.ibb.co/kvX4fyr/Logo-Intent-Fi.png",
      userId: address,
      userIdType: "hex",
      disclosures: {
        minimumAge: 18,
        ofac: false,
      },
    }).build();
  }, [address, identityVerifierAddress]);

  const handleStartVerification = () => {
    if (!isConnected) {
      toast.error("Wallet not connected");
    } else {
      setLoading(true);
      setTimeout(() => {
        setVerificationStatus("pending");
        setLoading(false);
      }, 1500);
    }
  };

  const handleVerificationSuccess = () => {
    setLoading(true);
    setTimeout(() => {
      setVerificationStatus("verified");
      setLoading(false);
    }, 1000);
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const pulseAnimation = {
    scale: [1, 1.05, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      repeatType: "reverse" as const,
    },
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto py-12 px-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="max-w-4xl mx-auto"
        >
          <header className="text-center mb-12">
            <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-yellow-500 mb-4">
              Secure Identity Verification
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Verify your identity on-chain while maintaining complete privacy
              and control of your data
            </p>
          </header>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden"
          >
            {!isConnected ? (
              <div className="flex flex-col items-center justify-center p-12">
                <motion.div
                  animate={pulseAnimation}
                  className="mb-8 w-24 h-24 rounded-full bg-orange-900/20 flex items-center justify-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-12 h-12 text-orange-500"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                    />
                  </svg>
                </motion.div>
                <h2 className="text-2xl font-semibold text-white mb-4">
                  Connect Your Wallet
                </h2>
                <p className="text-gray-400 mb-8 text-center max-w-md">
                  Connect your wallet to begin the verification process and
                  access the full features of the platform
                </p>
                <WalletConnect />
              </div>
            ) : verificationStatus === "notStarted" ? (
              <div className="grid md:grid-cols-2 gap-0">
                <div className="p-10">
                  <motion.div
                    variants={container}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                  >
                    <motion.div variants={item}>
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-orange-900/30 flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4 text-orange-500"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <p className="text-orange-500 font-medium">
                          Wallet Connected
                        </p>
                      </div>
                      <p className="text-gray-400 text-sm">
                        Address:{" "}
                        {address
                          ? `${address.substring(0, 6)}...${address.substring(
                              address.length - 4
                            )}`
                          : ""}
                      </p>
                    </motion.div>

                    <motion.h2
                      variants={item}
                      className="text-2xl font-bold text-white"
                    >
                      Verify Your Identity
                    </motion.h2>

                    <motion.p variants={item} className="text-gray-400">
                      Complete these steps to verify your identity with Self
                      protocol:
                    </motion.p>

                    <motion.ol variants={container} className="space-y-6">
                      <motion.li
                        variants={item}
                        className="flex items-start space-x-3"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-900/20 flex items-center justify-center text-orange-500 font-bold">
                          1
                        </div>
                        <div>
                          <h3 className="font-medium text-white">
                            Download the Self App
                          </h3>
                          <p className="text-gray-400 text-sm">
                            Get the Self app from App Store or Google Play
                          </p>
                          <div className="flex space-x-2 mt-2">
                            <a
                              href="https://apps.apple.com/app/self/id1630008171"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-black text-white text-xs px-3 py-1 rounded-md flex items-center border border-zinc-700"
                            >
                              <svg
                                className="w-4 h-4 mr-1"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"></path>
                              </svg>
                              App Store
                            </a>
                            <a
                              href="https://play.google.com/store/apps/details?id=xyz.self.passport"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-black text-white text-xs px-3 py-1 rounded-md flex items-center border border-zinc-700"
                            >
                              <svg
                                className="w-4 h-4 mr-1"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M3.609 1.814L13.792 12 3.609 22.186c-.181.181-.29.423-.29.684v-.369c0-.26.109-.503.29-.683L13.423 12 3.61 2.185A.97.97 0 013.32 1.5v.315c0 .26.109.503.29.683zm7.55 10.18L2.93 3.768 17.273 12 2.93 20.232l8.229-8.229a.97.97 0 000-1.369zM13.791 12L3.609 1.814 18.568 12 3.609 22.186 13.792 12z"></path>
                              </svg>
                              Google Play
                            </a>
                          </div>
                        </div>
                      </motion.li>

                      <motion.li
                        variants={item}
                        className="flex items-start space-x-3"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-900/20 flex items-center justify-center text-orange-500 font-bold">
                          2
                        </div>
                        <div>
                          <h3 className="font-medium text-white">
                            Click &quot;Start Verification&quot;
                          </h3>
                          <p className="text-gray-400 text-sm">
                            We&apos;ll generate a unique QR code for your
                            verification
                          </p>
                        </div>
                      </motion.li>

                      <motion.li
                        variants={item}
                        className="flex items-start space-x-3"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-900/20 flex items-center justify-center text-orange-500 font-bold">
                          3
                        </div>
                        <div>
                          <h3 className="font-medium text-white">
                            Scan QR Code with Self App
                          </h3>
                          <p className="text-gray-400 text-sm">
                            Open the Self app and scan the QR code to begin
                            verification
                          </p>
                        </div>
                      </motion.li>

                      <motion.li
                        variants={item}
                        className="flex items-start space-x-3"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-900/20 flex items-center justify-center text-orange-500 font-bold">
                          4
                        </div>
                        <div>
                          <h3 className="font-medium text-white">
                            Complete Verification
                          </h3>
                          <p className="text-gray-400 text-sm">
                            Follow the instructions in the Self app to verify
                            your identity
                          </p>
                        </div>
                      </motion.li>
                    </motion.ol>

                    <motion.div variants={item} className="mt-8">
                      <Button
                        onClick={handleStartVerification}
                        disabled={loading}
                        className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white px-8 py-4 rounded-lg text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 w-full flex justify-center items-center"
                      >
                        {loading ? (
                          <div className="flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Processing...
                          </div>
                        ) : (
                          "Start Verification"
                        )}
                      </Button>
                    </motion.div>
                  </motion.div>
                </div>

                <div className="bg-zinc-800/50 p-10 flex flex-col items-center justify-center">
                  <motion.div
                    variants={fadeIn}
                    className="rounded-xl bg-zinc-900 p-6 shadow-lg border border-zinc-800"
                  >
                    <div className="bg-orange-900/10 rounded-lg p-4 mb-4 border border-orange-900/20">
                      <h3 className="text-orange-500 font-bold mb-2">
                        Verify Once, Use Anywhere
                      </h3>
                      <p className="text-orange-200/70 text-sm">
                        Your verification is cached after successful completion.
                        You&apos;ll only need to verify once, and the protocol
                        will remember your verification status for all future
                        transactions.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-orange-900/30 flex items-center justify-center mt-0.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4 text-orange-500"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-medium text-white">
                            Privacy Preserving
                          </h4>
                          <p className="text-gray-400 text-sm">
                            Your personal data never leaves your device
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-orange-900/30 flex items-center justify-center mt-0.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4 text-orange-500"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-medium text-white">
                            Zero-Knowledge Proofs
                          </h4>
                          <p className="text-gray-400 text-sm">
                            Verify claims without revealing the underlying data
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-orange-900/30 flex items-center justify-center mt-0.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4 text-orange-500"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-medium text-white">
                            Onchain Verification
                          </h4>
                          <p className="text-gray-400 text-sm">
                            Securely stored on the Celo blockchain
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-orange-900/30 flex items-center justify-center mt-0.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4 text-orange-500"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-medium text-white">
                            Regulatory Compliant
                          </h4>
                          <p className="text-gray-400 text-sm">
                            Meets KYC/AML requirements without compromising
                            privacy
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            ) : verificationStatus === "pending" ? (
              <div className="p-12 text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold text-white mb-6">
                    Scan QR Code with Self App
                  </h2>

                  <div className="flex flex-col items-center justify-center">
                    <div className="mb-8 border-4 border-orange-500/20 rounded-2xl p-4 bg-zinc-800 inline-block shadow-lg">
                      {selfApp && (
                        <SelfQRcodeWrapper
                          selfApp={selfApp}
                          onSuccess={handleVerificationSuccess}
                          size={280}
                        />
                      )}
                    </div>

                    <div className="max-w-md mx-auto">
                      <div className="space-y-4">
                        <div className="p-4 bg-orange-900/20 rounded-lg border border-orange-900/30">
                          <h3 className="text-orange-500 font-medium flex items-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5 mr-2"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                              />
                            </svg>
                            Don&apos;t see the QR code?
                          </h3>
                          <p className="text-orange-200/70 text-sm">
                            Make sure you have downloaded the Self app and try
                            refreshing the page.
                          </p>
                        </div>

                        <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                          <p className="text-gray-400 text-sm">
                            Contract address:{" "}
                            <span className="font-mono text-gray-300">
                              {identityVerifierAddress}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            ) : verificationStatus === "verified" ? (
              <div className="p-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="max-w-lg mx-auto text-center"
                >
                  <div className="inline-flex items-center justify-center mb-8">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping opacity-25"></div>
                      <div className="relative w-24 h-24 rounded-full bg-orange-900/30 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-12 h-12 text-orange-500"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <h2 className="text-3xl font-bold text-orange-500 mb-4">
                    Verification Successful!
                  </h2>

                  <p className="text-gray-300 text-lg mb-6">
                    Your identity has been verified and <strong>cached</strong>{" "}
                    on the Celo blockchain.
                  </p>

                  <div className="p-6 bg-orange-900/10 border border-orange-900/20 rounded-xl mb-8">
                    <h3 className="text-orange-500 font-medium mb-2">
                      Verification Successfully Cached
                    </h3>
                    <p className="text-orange-200/70">
                      Your verification status has been securely stored. You
                      won&apos;t need to perform this verification again for
                      future transactions with our protocol.
                    </p>
                  </div>

                  <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                    <Link href="/intent" className="flex-1">
                      <Button className="w-full bg-gradient-to-r from-orange-600 cursor-pointer to-orange-500 hover:from-orange-700 hover:to-orange-600 py-6 text-lg">
                        Go to IntentFi
                      </Button>
                    </Link>

                    <Link href="/" className="flex-1">
                      <Button
                        variant="outline"
                        className="w-full py-6 text-lg border-zinc-700 text-black cursor-pointer hover:bg-zinc-800"
                      >
                        Return to Home
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="p-12 text-center">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="max-w-lg mx-auto"
                >
                  <div className="mb-8 w-24 h-24 mx-auto rounded-full bg-red-900/30 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-12 h-12 text-red-500"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                      />
                    </svg>
                  </div>

                  <h2 className="text-3xl font-bold text-red-500 mb-4">
                    Verification Failed
                  </h2>

                  <p className="text-gray-300 mb-8">
                    There was an issue with the verification process. Please try
                    again.
                  </p>

                  <div className="p-6 bg-red-900/10 border border-red-900/20 rounded-xl mb-8 text-left">
                    <h3 className="text-red-500 font-medium mb-2">
                      Possible Issues:
                    </h3>
                    <ul className="text-red-200/70 text-sm space-y-2 list-disc pl-5">
                      <li>
                        The Self app was closed before completing verification
                      </li>
                      <li>Network connection issues during verification</li>
                      <li>Passport information couldn&apos;t be verified</li>
                      <li>Verification timed out</li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleStartVerification}
                    className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white px-8 py-4 rounded-lg text-lg font-medium"
                  >
                    Try Again
                  </Button>
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.6 } }}
          className="mt-12 text-center"
        >
          <p className="text-gray-500 text-sm">
            Need help?{" "}
            <a
              href="https://docs.self.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 hover:text-orange-400 font-medium"
            >
              Visit Self Documentation
            </a>{" "}
            or{" "}
            <a
              href="mailto:support@intent.fi"
              className="text-orange-500 hover:text-orange-400 font-medium"
            >
              Contact Support
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
