"use client";

import { useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

function MoonLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" className="flex-shrink-0">
      <defs>
        <radialGradient id="moon-glow" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fffbe6"/>
          <stop offset="40%" stopColor="#facc15"/>
          <stop offset="100%" stopColor="#b45309"/>
        </radialGradient>
        <filter id="moon-outer-glow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.98  0 0 0 0 0.8  0 0 0 0 0.08  0 0 0 0.6 0" result="glow"/>
          <feMerge>
            <feMergeNode in="glow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#moon-outer-glow)">
        <circle cx="14" cy="15" r="10" fill="url(#moon-glow)"/>
        <circle cx="19" cy="13" r="8" fill="#0a0a0e"/>
      </g>
      <circle cx="10" cy="13" r="1.2" fill="#d4a017" opacity="0.4"/>
      <circle cx="12" cy="18" r="0.8" fill="#d4a017" opacity="0.3"/>
      <circle cx="25" cy="7" r="0.7" fill="#facc15" opacity="0.9"/>
      <circle cx="27" cy="12" r="0.4" fill="#fef08a" opacity="0.7"/>
    </svg>
  );
}

interface NavbarProps {
  connected?: boolean;
  roundId?: number;
  bnbPrice?: number | null;
  onToggleSound?: () => boolean;
}

export function Navbar({ connected, roundId, bnbPrice, onToggleSound }: NavbarProps) {
  const [soundOn, setSoundOn] = useState(true);
  return (
    <header
      className="flex items-center justify-between px-3 sm:px-4 py-2 gap-2"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(9,9,11,0.85)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Link href="/" className="flex items-center gap-1.5 flex-shrink-0">
          <MoonLogo />
          <span className="text-sm font-black tracking-tight text-white">
            MnM
          </span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-zinc-300 min-w-0">
          <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
            {connected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-1.5 w-1.5 ${connected ? "bg-emerald-400" : "bg-red-500"}`}
            />
          </span>
          <span className="font-mono whitespace-nowrap">
            {connected ? "Live" : "..."}
            {roundId && roundId > 0 ? ` #${roundId}` : ""}
          </span>
          {bnbPrice && (
            <span className="font-mono text-amber-300 whitespace-nowrap hidden sm:inline">
              BNB ${bnbPrice.toFixed(0)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {onToggleSound && (
          <button
            onClick={() => {
              const result = onToggleSound();
              setSoundOn(result);
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
            style={{ background: "rgba(255,255,255,0.04)" }}
            title={soundOn ? "Mute" : "Unmute"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {soundOn ? (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </>
              ) : (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </>
              )}
            </svg>
          </button>
        )}
        <ConnectButton.Custom>
          {({ account, chain, openConnectModal, mounted }) => {
            if (!mounted || !account || !chain) {
              return (
                <button
                  onClick={openConnectModal}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white whitespace-nowrap"
                  style={{
                    background: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
                    border: "1px solid rgba(239,68,68,0.4)",
                  }}
                >
                  Connect
                </button>
              );
            }
            return (
              <ConnectButton accountStatus="avatar" chainStatus="icon" showBalance={false} />
            );
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  );
}
