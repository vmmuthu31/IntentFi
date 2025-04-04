"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CompliancePassport() {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Compliance Passport</CardTitle>
            <CardDescription>
              Your privacy-preserving compliance status across chains
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500 border-0"
          >
            Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attestations">Attestations</TabsTrigger>
            <TabsTrigger value="chains">Chain Access</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              <div className="p-4 rounded-lg border">
                <h3 className="font-medium mb-2">Passport Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Passport ID</div>
                    <div className="font-mono">SLF-xxxx...76f2</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <div className="text-green-600 dark:text-green-400">
                      Verified
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Issued Date</div>
                    <div>Apr 4, 2025</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Expires</div>
                    <div>Apr 4, 2026</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border">
                <h3 className="font-medium mb-2">Compliance Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="text-sm">KYC/AML Verification</div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500 border-0">
                      Completed
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm">Accredited Investor Status</div>
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 border-0">
                      Pending
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm">Cross-Chain Reputation</div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500 border-0">
                      Good Standing
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="attestations">
            <div className="space-y-4">
              <AttestationItem
                title="Identity Verification"
                type="KYC"
                issuer="Self Protocol"
                date="Apr 4, 2025"
                status="verified"
              />
              <AttestationItem
                title="Address Proof"
                type="Residence"
                issuer="Self Protocol"
                date="Apr 4, 2025"
                status="verified"
              />
              <AttestationItem
                title="Source of Funds"
                type="Financial"
                issuer="Self Protocol"
                date="Apr 4, 2025"
                status="verified"
              />
              <AttestationItem
                title="Investor Accreditation"
                type="Financial"
                issuer="Self Protocol"
                date="Pending"
                status="pending"
              />
            </div>
          </TabsContent>

          <TabsContent value="chains">
            <div className="space-y-4">
              <ChainAccessItem
                chain="Ethereum"
                status="active"
                lastUsed="5 minutes ago"
                complianceLevel="Full"
              />
              <ChainAccessItem
                chain="Polygon"
                status="active"
                lastUsed="2 hours ago"
                complianceLevel="Full"
              />
              <ChainAccessItem
                chain="Celo"
                status="active"
                lastUsed="1 day ago"
                complianceLevel="Full"
              />
              <ChainAccessItem
                chain="Arbitrum"
                status="active"
                lastUsed="Never"
                complianceLevel="Full"
              />
              <ChainAccessItem
                chain="Avalanche"
                status="active"
                lastUsed="Never"
                complianceLevel="Full"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface AttestationItemProps {
  title: string;
  type: string;
  issuer: string;
  date: string;
  status: "verified" | "pending" | "expired";
}

function AttestationItem({
  title,
  type,
  issuer,
  date,
  status,
}: AttestationItemProps) {
  const statusColor = {
    verified:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500",
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500",
    expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500",
  }[status];

  const statusText = {
    verified: "Verified",
    pending: "Pending",
    expired: "Expired",
  }[status];

  return (
    <div className="p-3 border rounded-lg flex justify-between items-center">
      <div>
        <h4 className="font-medium">{title}</h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{type}</span>
          <span>•</span>
          <span>Issued by {issuer}</span>
          <span>•</span>
          <span>{date}</span>
        </div>
      </div>
      <Badge className={`${statusColor} border-0`}>{statusText}</Badge>
    </div>
  );
}

interface ChainAccessItemProps {
  chain: string;
  status: "active" | "inactive";
  lastUsed: string;
  complianceLevel: "Full" | "Limited" | "None";
}

function ChainAccessItem({
  chain,
  status,
  lastUsed,
  complianceLevel,
}: ChainAccessItemProps) {
  const chainColor =
    {
      Ethereum: "bg-blue-500",
      Polygon: "bg-purple-600",
      Celo: "bg-green-500",
      Arbitrum: "bg-blue-700",
      Avalanche: "bg-red-500",
    }[chain] || "bg-gray-500";

  const complianceLevelColor = {
    Full: "text-green-600 dark:text-green-400",
    Limited: "text-yellow-600 dark:text-yellow-400",
    None: "text-red-600 dark:text-red-400",
  }[complianceLevel];

  return (
    <div className="p-3 border rounded-lg flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${chainColor}`} />
        <div>
          <h4 className="font-medium">{chain}</h4>
          <div className="text-xs text-muted-foreground">
            Last used: {lastUsed}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-medium ${complianceLevelColor}`}>
          {complianceLevel} Access
        </div>
        <div className="text-xs text-muted-foreground">
          Status: {status === "active" ? "Active" : "Inactive"}
        </div>
      </div>
    </div>
  );
}
