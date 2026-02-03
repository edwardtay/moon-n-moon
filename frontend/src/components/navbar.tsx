"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { siteConfig } from "@/config/site";

export function Navbar() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        {siteConfig.name}
      </Link>
      <ConnectButton />
    </header>
  );
}
