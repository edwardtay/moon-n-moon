"use client";

import { useRef, useCallback, useEffect } from "react";
import type { RoundPhase } from "@/hooks/use-game-stream";

/**
 * Web Audio API synthesized game sounds — no external files needed.
 * Tick: rising pitch beep as multiplier grows
 * Crash: low rumble explosion
 * Cashout: pleasant ascending "cha-ching"
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTick(multiplier: number) {
  const ctx = getCtx();
  if (!ctx) return;

  // Pitch rises with multiplier: 400Hz at 1x → 1200Hz at 10x
  const freq = 400 + (multiplier / 100 - 1) * 90;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = Math.min(freq, 2000);
  gain.gain.value = 0.04; // Very quiet
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.08);
}

function playCrash() {
  const ctx = getCtx();
  if (!ctx) return;

  // Low rumble noise burst
  const bufferSize = ctx.sampleRate * 0.5;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  // Low-pass for rumble feel
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 300;

  const gain = ctx.createGain();
  gain.gain.value = 0.25;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start();

  // Sub-bass thud
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();
  sub.type = "sine";
  sub.frequency.value = 60;
  sub.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.3);
  subGain.gain.value = 0.3;
  subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  sub.connect(subGain);
  subGain.connect(ctx.destination);
  sub.start();
  sub.stop(ctx.currentTime + 0.3);
}

function playCashout() {
  const ctx = getCtx();
  if (!ctx) return;

  // Ascending two-tone "cha-ching"
  const notes = [800, 1200];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.1 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.1);
    osc.stop(ctx.currentTime + i * 0.1 + 0.2);
  });
}

function playBet() {
  const ctx = getCtx();
  if (!ctx) return;

  // Quick descending "blip"
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 600;
  osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
  gain.gain.value = 0.08;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
}

function playRoundStart() {
  const ctx = getCtx();
  if (!ctx) return;

  // Ascending sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 200;
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
  gain.gain.value = 0.06;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

export function useGameSounds() {
  const prevPhaseRef = useRef<RoundPhase>("waiting");
  const lastTickRef = useRef(0);
  const enabledRef = useRef(true);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const init = () => {
      getCtx();
      window.removeEventListener("click", init);
      window.removeEventListener("keydown", init);
    };
    window.addEventListener("click", init);
    window.addEventListener("keydown", init);
    return () => {
      window.removeEventListener("click", init);
      window.removeEventListener("keydown", init);
    };
  }, []);

  const onPhaseChange = useCallback((phase: RoundPhase) => {
    if (!enabledRef.current) return;
    const prev = prevPhaseRef.current;

    if (phase === "active" && prev !== "active") {
      playRoundStart();
    }
    if (phase === "crashed" && prev === "active") {
      playCrash();
    }

    prevPhaseRef.current = phase;
  }, []);

  const onTick = useCallback((multiplier: number) => {
    if (!enabledRef.current) return;
    const now = Date.now();
    // Tick frequency increases with multiplier: every 500ms at 1x → every 150ms at 5x+
    const interval = Math.max(150, 500 - (multiplier / 100 - 1) * 80);
    if (now - lastTickRef.current > interval) {
      lastTickRef.current = now;
      playTick(multiplier);
    }
  }, []);

  const onCashout = useCallback(() => {
    if (!enabledRef.current) return;
    playCashout();
  }, []);

  const onBet = useCallback(() => {
    if (!enabledRef.current) return;
    playBet();
  }, []);

  const toggleSound = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    return enabledRef.current;
  }, []);

  return { onPhaseChange, onTick, onCashout, onBet, toggleSound };
}
