"use client";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";

const VerifyPageClient = dynamic(
  () => import("@/components/identity/verifyPage"),
  { ssr: false }
);

function VerifyPage() {
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
    <div className="flex flex-col min-h-screen bg-black text-white">
      <VerifyPageClient
        onVerificationComplete={onVerificationComplete}
        redirectUrl={redirectUrl}
      />
    </div>
  );
}

export default VerifyPage;
