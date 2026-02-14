"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Navbar() {
  return (
    <header
      className="flex items-center justify-between px-6 py-3"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(9,9,11,0.8)",
        backdropFilter: "blur(12px)",
      }}
    >
      <Link href="/" className="flex items-center gap-3">
        <span className="text-lg font-black tracking-tight text-zinc-100">
          Moon or Doom
        </span>
        <span
          className="text-[9px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded"
          style={{
            color: "#a78bfa",
            background: "rgba(167,139,250,0.08)",
            border: "1px solid rgba(167,139,250,0.15)",
          }}
        >
          AI vs Human
        </span>
      </Link>
      <ConnectButton />
    </header>
  );
}
