"use client";

import { useState, useEffect } from "react";

/**
 * Fetches live BNB/USD price from CoinGecko free API.
 * Refreshes every 30 seconds.
 */
export function useBnbPrice() {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchPrice() {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd",
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.binancecoin?.usd) {
          setPrice(data.binancecoin.usd);
        }
      } catch {
        // Silently fail — price is optional
      }
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  /** Convert BNB amount to USD string */
  function toUsd(bnb: number): string | null {
    if (!price) return null;
    return `$${(bnb * price).toFixed(2)}`;
  }

  return { price, toUsd };
}
