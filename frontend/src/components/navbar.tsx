"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface NavbarProps {
  connected?: boolean;
  roundId?: number;
  bnbPrice?: number | null;
}

export function Navbar({ connected, roundId, bnbPrice }: NavbarProps) {
  return (
    <header
      className="flex items-center justify-between px-4 py-2"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(9,9,11,0.8)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-base font-black tracking-tight text-zinc-100">
            Moon or Doom
          </span>
        </Link>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <span className="relative flex h-1.5 w-1.5">
            {connected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-1.5 w-1.5 ${connected ? "bg-emerald-400" : "bg-red-500"}`}
            />
          </span>
          <span className="font-mono">
            {connected ? "Live" : "..."}
            {roundId && roundId > 0 ? ` #${roundId}` : ""}
          </span>
          {bnbPrice && (
            <span className="font-mono text-amber-400/60 ml-1">
              BNB ${bnbPrice.toFixed(0)}
            </span>
          )}
        </div>
      </div>
      <ConnectButton />
    </header>
  );
}
