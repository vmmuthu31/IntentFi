"use client";
import dynamic from "next/dynamic";

const VerifyPageClient = dynamic(
  () => import("@/components/identity/verifyPage"),
  { ssr: false }
);

function page() {
  return (
    <div>
      <VerifyPageClient />
    </div>
  );
}

export default page;
