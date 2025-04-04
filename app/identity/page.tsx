import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { IdentityVerification } from "@/components/identity/identity-verification";
import { CompliancePassport } from "@/components/identity/compliance-passport";

export const metadata = {
  title: "Identity Verification",
  description:
    "Verify your identity once, access all chains with privacy-preserving compliance",
};

export default function IdentityPage() {
  return (
    <DashboardShell>
      <DashboardHeader
        heading="Identity Verification"
        text="Verify your identity once with Self Protocol and access all chains while preserving your privacy."
      />

      <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
        <IdentityVerification />
        <CompliancePassport />
      </div>
    </DashboardShell>
  );
}
