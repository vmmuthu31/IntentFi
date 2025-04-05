"use client";
import dynamic from "next/dynamic";

const VerifyPageClient = dynamic(
  () => import("@/components/identity/verifyPage"),
  { ssr: false }
);

function page() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <VerifyPageClient />
    </div>
  );
}

export default page;
