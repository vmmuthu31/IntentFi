"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const mainNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "📊",
  },
  {
    title: "Intent",
    href: "/intent",
    icon: "🎯",
  },
  {
    title: "Identity",
    href: "/identity",
    icon: "🔒",
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: "📈",
  },
];

interface MainNavProps {
  className?: string;
}

export function MainNav({ className }: MainNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex items-center space-x-6">
      <nav className={cn("hidden md:flex items-center space-x-6", className)}>
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative group flex items-center text-sm font-medium transition-colors hover:text-primary",
              pathname === item.href ? "text-primary" : "text-muted-foreground"
            )}
          >
            <span className="mr-1">{item.icon}</span>
            {item.title}
            {pathname === item.href && (
              <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 transform" />
            )}
            <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
