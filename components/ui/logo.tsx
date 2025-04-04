import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  onClick?: () => void;
}

export function Logo({ className, onClick }: LogoProps) {
  return (
    <Link href="/" onClick={onClick} className="flex items-center">
      <div
        className={cn(
          "text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 bg-clip-text text-transparent",
          className
        )}
      >
        <span className="mr-1">CCIF</span>
        <span className="text-sm font-normal opacity-80">
          Cross-Chain Intent Finance
        </span>
      </div>
    </Link>
  );
}
