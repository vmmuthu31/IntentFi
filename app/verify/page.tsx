"use client";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const VerifyPageClient = dynamic(
  () => import("@/components/identity/verifyPage"),
  { ssr: false }
);

// Client component that safely uses useSearchParams
function VerifyPageWithParams() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/intent";

  // This function will be passed to the VerifyPageClient component
  const onVerificationComplete = () => {
    // Redirect back to the original page after successful verification
    setTimeout(() => {
      router.push(redirectUrl);
    }, 3000); // Give user 3 seconds to see success message
  };

  return (
    <VerifyPageClient
      onVerificationComplete={onVerificationComplete}
      redirectUrl={redirectUrl}
    />
  );
}

// Main page component with Suspense boundary
function VerifyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <Suspense
        fallback={
          <div className="p-10 text-center">Loading verification page...</div>
        }
      >
        <VerifyPageWithParams />
      </Suspense>
    </div>
  );
}

export default VerifyPage;
