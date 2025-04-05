"use client";

import React from "react";
import { MainNav } from "@/components/layouts/main-nav";
import { Logo } from "@/components/ui/logo";
import WalletConnect from "../ui/WalletConnect";
import { ThemeToggle } from "../theme-toggle";
import { MobileNav } from "./mobile-nav";
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background rounded-t-2xl backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between w-full px-5 md:px-10 lg:px-10">
        <Logo />
        <MainNav />
        <MobileNav />
        <div className="md:flex hidden items-center gap-4">
          <WalletConnect />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
