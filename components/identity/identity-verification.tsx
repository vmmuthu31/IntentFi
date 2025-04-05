"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function IdentityVerification() {
  const [verificationStep, setVerificationStep] = useState<
    "not_started" | "connecting" | "uploading" | "verifying" | "completed"
  >("not_started");
  const [dialogOpen, setDialogOpen] = useState(false);

  const startVerification = () => {
    setVerificationStep("connecting");
    setTimeout(() => {
      setVerificationStep("uploading");
      setTimeout(() => {
        setVerificationStep("verifying");
        setTimeout(() => {
          setVerificationStep("completed");
          setDialogOpen(true);
        }, 3000);
      }, 3000);
    }, 2000);
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Verify Your Identity</CardTitle>
          <CardDescription>
            Complete one-time verification with Self Protocol to access DeFi
            services across all chains
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-6">
            <div className="rounded-lg border p-4">
              <h3 className="text-lg font-medium mb-2">
                Privacy-Preserving Verification
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Self Protocol allows you to verify your identity once and create
                cryptographic proofs that can be used across any blockchain
                without revealing your personal information.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="mr-2 h-4 w-4 text-green-500">✓</div>
                    <span>No data sharing with third parties</span>
                  </div>
                  <div className="flex items-center">
                    <div className="mr-2 h-4 w-4 text-green-500">✓</div>
                    <span>Create identity attestations</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="mr-2 h-4 w-4 text-green-500">✓</div>
                    <span>Control your personal data</span>
                  </div>
                  <div className="flex items-center">
                    <div className="mr-2 h-4 w-4 text-green-500">✓</div>
                    <span>Compatible with all major chains</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="text-lg font-medium mb-2">Verification Process</h3>
              <div className="space-y-4">
                <VerificationStep
                  number={1}
                  title="Connect your wallet"
                  description="Link your wallet to begin the verification process"
                  status={
                    verificationStep === "not_started"
                      ? "pending"
                      : verificationStep === "connecting"
                      ? "in_progress"
                      : "completed"
                  }
                />
                <VerificationStep
                  number={2}
                  title="Upload identification"
                  description="Provide a government-issued ID for verification"
                  status={
                    verificationStep === "not_started" ||
                    verificationStep === "connecting"
                      ? "pending"
                      : verificationStep === "uploading"
                      ? "in_progress"
                      : "completed"
                  }
                />
                <VerificationStep
                  number={3}
                  title="Verification"
                  description="Self Protocol verifies your identity"
                  status={
                    verificationStep === "not_started" ||
                    verificationStep === "connecting" ||
                    verificationStep === "uploading"
                      ? "pending"
                      : verificationStep === "verifying"
                      ? "in_progress"
                      : "completed"
                  }
                />
                <VerificationStep
                  number={4}
                  title="Compliance passport creation"
                  description="Generate your cross-chain compliance passport"
                  status={
                    verificationStep === "completed" ? "completed" : "pending"
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={startVerification}
            disabled={
              verificationStep !== "not_started" &&
              verificationStep !== "completed"
            }
            className="w-full bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 text-white"
          >
            {verificationStep === "not_started" && "Start Verification"}
            {verificationStep === "connecting" && "Connecting..."}
            {verificationStep === "uploading" && "Uploading Documents..."}
            {verificationStep === "verifying" && "Verifying Identity..."}
            {verificationStep === "completed" && "Verification Complete ✓"}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verification Successful!</DialogTitle>
            <DialogDescription>
              Your identity has been verified through Self Protocol. You can now
              access DeFi services across all chains.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-green-600 dark:text-green-400"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-center">
              Identity Verified on Self Protocol
            </h3>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Your privacy-preserving compliance passport has been created
            </p>
          </div>
          <DialogFooter>
            <Button
              className="w-full bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 text-white"
              onClick={() => setDialogOpen(false)}
            >
              Continue to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface VerificationStepProps {
  number: number;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
}

function VerificationStep({
  number,
  title,
  description,
  status,
}: VerificationStepProps) {
  return (
    <div className="flex">
      <div className="mr-4">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            status === "pending"
              ? "bg-gray-100 text-gray-500 dark:bg-gray-800"
              : status === "in_progress"
              ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          }`}
        >
          {status === "completed" ? "✓" : number}
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
        {status === "in_progress" && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
            <div
              className="bg-blue-600 h-1.5 rounded-full animate-pulse-width"
              style={{ width: "60%" }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}
