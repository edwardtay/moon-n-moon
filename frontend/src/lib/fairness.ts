import { createHmac, randomBytes } from "crypto";
import { keccak256, encodePacked } from "viem";

/**
 * Provably fair crash point generation.
 *
 * 1. Generate a random serverSeed per round
 * 2. Derive crash point from serverSeed + roundId using HMAC-SHA256
 * 3. Commit keccak256(crashMultiplier, serverSeed) on-chain before round starts
 * 4. Reveal serverSeed + crashMultiplier after crash — anyone can verify
 */

export function generateServerSeed(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Derive a crash point from serverSeed and roundId.
 * Returns multiplier scaled by 100 (e.g., 250 = 2.50x).
 * House edge: ~3% (1 in 33 rounds is instant crash at 1.00x).
 */
export function deriveCrashPoint(
  serverSeed: string,
  roundId: number
): number {
  const hmac = createHmac("sha256", serverSeed);
  hmac.update(String(roundId));
  const hex = hmac.digest("hex");

  // Take first 13 hex chars (52 bits)
  const h = parseInt(hex.slice(0, 13), 16);

  // ~3% instant crash (house edge)
  const e = Math.pow(2, 52);
  if (h % 33 === 0) return 100; // 1.00x = instant crash

  // Map to exponential distribution: result = 99 / (1 - h/e) / 100
  // This gives us a distribution where:
  // - ~50% of rounds crash below 2x
  // - ~33% crash below 1.5x
  // - ~10% go above 10x
  // - ~1% go above 100x
  const result = Math.floor((100 * e - h) / (e - h));

  return Math.max(100, result); // minimum 1.00x
}

/**
 * Create the commit hash for on-chain verification.
 * Must match: keccak256(abi.encodePacked(crashMultiplier, salt))
 * where salt is bytes32 of the serverSeed.
 */
export function createCommitHash(
  crashMultiplier: number,
  serverSeed: string
): `0x${string}` {
  const salt = `0x${serverSeed.padStart(64, "0")}` as `0x${string}`;
  return keccak256(
    encodePacked(["uint256", "bytes32"], [BigInt(crashMultiplier), salt])
  );
}

/**
 * Convert server seed to bytes32 for contract interaction.
 */
export function serverSeedToBytes32(serverSeed: string): `0x${string}` {
  return `0x${serverSeed.padStart(64, "0")}` as `0x${string}`;
}

/**
 * Verify a crash point is valid given the serverSeed and roundId.
 * Anyone can call this to verify fairness after a round.
 */
export function verifyCrashPoint(
  serverSeed: string,
  roundId: number,
  claimedCrash: number
): boolean {
  const derived = deriveCrashPoint(serverSeed, roundId);
  return derived === claimedCrash;
}

/**
 * Format multiplier for display: 250 → "2.50"
 */
export function formatMultiplier(scaled: number): string {
  return (scaled / 100).toFixed(2);
}
