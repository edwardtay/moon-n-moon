"use client";

import { useRef, useState, useEffect, useCallback, memo } from "react";
import type { RoundPhase } from "@/hooks/use-game-stream";
import { DoomSkullMascot, RocketMascot } from "./mascots";

interface CrashDisplayProps {
  phase: RoundPhase;
  multiplier: number;
  crashPoint: number | null;
  countdown: number;
  roundId: number;
  startTime: number | null;
}

function getColor(m: number) {
  if (m < 150) return { text: "#00ff88", glow: "0,255,136" };
  if (m < 250) return { text: "#44ff44", glow: "68,255,68" };
  if (m < 400) return { text: "#ffdd00", glow: "255,221,0" };
  if (m < 700) return { text: "#ff8800", glow: "255,136,0" };
  if (m < 1500) return { text: "#ff4444", glow: "255,68,68" };
  return { text: "#ff44ff", glow: "255,68,255" };
}

function getYSteps(maxM: number): number[] {
  const steps: number[] = [];
  if (maxM <= 200) for (let i = 100; i <= maxM + 20; i += 25) steps.push(i);
  else if (maxM <= 500) for (let i = 100; i <= maxM + 50; i += 50) steps.push(i);
  else if (maxM <= 2000) for (let i = 100; i <= maxM + 100; i += 200) steps.push(i);
  else for (let i = 100; i <= maxM + 500; i += 500) steps.push(i);
  return steps;
}

function CrashDisplayInner({
  phase,
  multiplier: serverMultiplier,
  crashPoint,
  countdown,
  roundId,
  startTime,
}: CrashDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const multiplierTextRef = useRef<HTMLDivElement>(null);
  const pointsRef = useRef<{ t: number; m: number }[]>([]);
  const animFrameRef = useRef<number>(0);
  const canvasSizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const [shaking, setShaking] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const [showRocket, setShowRocket] = useState(false);
  const prevPhaseRef = useRef<RoundPhase>(phase);

  // Cache canvas dimensions with ResizeObserver (not per-frame getBoundingClientRect)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const update = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvasSizeRef.current = { w: rect.width, h: rect.height, dpr };
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(canvas);
    return () => obs.disconnect();
  }, []);

  // Phase transitions
  useEffect(() => {
    if (phase === "active" && prevPhaseRef.current !== "active") {
      pointsRef.current = [];
      setShowRocket(true);
    }
    if (phase !== "active") setShowRocket(false);
    if (phase === "crashed" && prevPhaseRef.current === "active") {
      setShaking(true);
      setShowExplosion(true);
      setTimeout(() => setShaking(false), 600);
      setTimeout(() => setShowExplosion(false), 1200);
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  // Stable canvas draw — no rapidly-changing dependencies
  const drawCanvas = useCallback(
    (currentMult: number, isCrashed: boolean, cp: number | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { w: W, h: H, dpr } = canvasSizeRef.current;
      if (W === 0 || H === 0) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const points = pointsRef.current;
      if (points.length < 2) return;

      const color = getColor(currentMult);
      const maxT = points[points.length - 1].t;
      const maxM = Math.max(currentMult, cp ?? 0, 200);
      const padding = { top: 40, right: 30, bottom: 40, left: 55 };
      const graphW = W - padding.left - padding.right;
      const graphH = H - padding.top - padding.bottom;

      const mapX = (t: number) =>
        padding.left + (t / Math.max(maxT, 1000)) * graphW;
      const mapY = (m: number) =>
        padding.top + graphH - ((m - 100) / (maxM - 100)) * graphH;

      // Grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      const ySteps = getYSteps(maxM);
      ctx.font = "12px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.textAlign = "right";
      for (const step of ySteps) {
        const y = mapY(step);
        if (y < padding.top || y > H - padding.bottom) continue;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(W - padding.right, y);
        ctx.stroke();
        ctx.fillText(
          `${(step / 100).toFixed(1)}x`,
          padding.left - 8,
          y + 3
        );
      }

      // Baseline
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, mapY(100));
      ctx.lineTo(W - padding.right, mapY(100));
      ctx.stroke();
      ctx.setLineDash([]);

      const lineColor = isCrashed ? "255,68,68" : color.glow;

      // Glow trail — reduced blur for performance (4px instead of 8px)
      ctx.save();
      ctx.filter = "blur(4px)";
      ctx.strokeStyle = `rgba(${lineColor},0.3)`;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const x = mapX(points[i].t),
          y = mapY(points[i].m);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // Main curve
      ctx.strokeStyle = isCrashed ? "#ff4444" : color.text;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = `rgba(${lineColor},0.5)`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const x = mapX(points[i].t),
          y = mapY(points[i].m);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Head dot (active only)
      if (!isCrashed && points.length > 0) {
        const last = points[points.length - 1];
        const hx = mapX(last.t),
          hy = mapY(last.m);
        const pulse = 1 + Math.sin(Date.now() / 150) * 0.3;
        const grad = ctx.createRadialGradient(
          hx,
          hy,
          0,
          hx,
          hy,
          14 * pulse
        );
        grad.addColorStop(0, `rgba(${lineColor},0.5)`);
        grad.addColorStop(1, `rgba(${lineColor},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(hx, hy, 14 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color.text;
        ctx.beginPath();
        ctx.arc(hx, hy, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Crash marker
      if (isCrashed && points.length > 0) {
        const last = points[points.length - 1];
        const hx = mapX(last.t),
          hy = mapY(last.m);
        const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 25);
        grad.addColorStop(0, "rgba(255,68,68,0.5)");
        grad.addColorStop(0.5, "rgba(255,68,68,0.1)");
        grad.addColorStop(1, "rgba(255,68,68,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(hx, hy, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ff4444";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        const s = 8;
        ctx.beginPath();
        ctx.moveTo(hx - s, hy - s);
        ctx.lineTo(hx + s, hy + s);
        ctx.moveTo(hx + s, hy - s);
        ctx.lineTo(hx - s, hy + s);
        ctx.stroke();
      }
    },
    []
  );

  // CLIENT-SIDE MULTIPLIER INTERPOLATION — 60fps smooth animation
  // Instead of relying on 50ms server ticks, compute multiplier locally from startTime
  useEffect(() => {
    if (phase !== "active" || !startTime) {
      if (phase === "crashed" && crashPoint) {
        drawCanvas(crashPoint, true, crashPoint);
        if (multiplierTextRef.current) {
          multiplierTextRef.current.textContent = `${(crashPoint / 100).toFixed(2)}x`;
          multiplierTextRef.current.style.color = "#ff4444";
          multiplierTextRef.current.style.filter =
            "drop-shadow(0 0 40px rgba(255,68,68,0.5))";
        }
        if (containerRef.current) {
          containerRef.current.style.borderColor = "rgba(255,68,68,0.2)";
          containerRef.current.style.boxShadow =
            "0 0 40px rgba(255,68,68,0.08)";
          containerRef.current.style.background =
            "linear-gradient(180deg, rgba(100,10,10,0.2) 0%, #060608 60%)";
        }
      }
      return;
    }

    let rocketHidden = false;

    const loop = () => {
      const elapsed = Date.now() - startTime;
      const localMult = Math.floor(100 * Math.exp(0.00006 * elapsed));

      // Record data point throttled to ~20fps (every 50ms)
      const pts = pointsRef.current;
      if (
        pts.length === 0 ||
        elapsed - pts[pts.length - 1].t > 50
      ) {
        pts.push({ t: elapsed, m: localMult });
      }

      // Direct DOM update — bypasses React re-render entirely
      if (multiplierTextRef.current) {
        const c = getColor(localMult);
        multiplierTextRef.current.textContent = `${(localMult / 100).toFixed(2)}x`;
        multiplierTextRef.current.style.color = c.text;
        multiplierTextRef.current.style.filter = `drop-shadow(0 0 40px rgba(${c.glow},0.5))`;
        multiplierTextRef.current.style.textShadow = `0 0 80px rgba(${c.glow},0.3)`;
      }

      // Update container glow directly
      if (containerRef.current) {
        const c = getColor(localMult);
        containerRef.current.style.borderColor = `rgba(${c.glow},0.2)`;
        containerRef.current.style.boxShadow = `0 0 40px rgba(${c.glow},0.05), inset 0 0 60px rgba(${c.glow},0.02)`;
        containerRef.current.style.background = `linear-gradient(180deg, rgba(${c.glow},0.03) 0%, #060608 50%)`;
      }

      // Hide rocket after 2x (single state update, not continuous)
      if (!rocketHidden && localMult >= 200) {
        rocketHidden = true;
        setShowRocket(false);
      }

      drawCanvas(localMult, false, null);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [phase, startTime, crashPoint, drawCanvas]);

  const color = getColor(serverMultiplier);

  return (
    <div
      ref={containerRef}
      className={`relative rounded-2xl overflow-hidden w-full ${shaking ? "animate-screen-shake" : ""}`}
      style={{
        height: "340px",
        background:
          phase === "crashed"
            ? "linear-gradient(180deg, rgba(100,10,10,0.2) 0%, #060608 60%)"
            : phase === "active"
              ? `linear-gradient(180deg, rgba(${color.glow},0.03) 0%, #060608 50%)`
              : "#060608",
        border:
          phase === "active"
            ? `1px solid rgba(${color.glow},0.2)`
            : phase === "crashed"
              ? "1px solid rgba(255,68,68,0.2)"
              : "1px solid rgba(255,255,255,0.06)",
        transition:
          phase === "active" ? "none" : "border-color 0.3s, background 0.5s",
        boxShadow:
          phase === "crashed"
            ? "0 0 40px rgba(255,68,68,0.08)"
            : "none",
      }}
    >
      {/* Canvas graph */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: phase === "active" || phase === "crashed" ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      />

      {/* Scanline overlay */}
      {phase === "active" && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.008) 2px, rgba(255,255,255,0.008) 4px)",
          }}
        />
      )}

      {/* Multiplier overlay — text updated via ref, not React state */}
      {(phase === "active" || phase === "crashed") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          {phase === "crashed" && (
            <div className="flex flex-col items-center mb-2">
              <DoomSkullMascot size={36} />
              <div className="text-xs font-bold text-red-400 uppercase tracking-[0.4em] mt-1">
                Crashed
              </div>
            </div>
          )}
          {showRocket && (
            <div className="absolute top-4 right-16 z-10">
              <RocketMascot size={28} />
            </div>
          )}
          <div
            ref={multiplierTextRef}
            className="font-mono font-black tabular-nums tracking-tighter leading-none"
            style={{
              fontSize: "clamp(3.5rem, 9vw, 6rem)",
              color: phase === "crashed" ? "#ff4444" : color.text,
              filter: `drop-shadow(0 0 40px rgba(${phase === "crashed" ? "255,68,68" : color.glow},0.5))`,
              textShadow: `0 0 80px rgba(${phase === "crashed" ? "255,68,68" : color.glow},0.3)`,
            }}
          >
            {phase === "crashed" && crashPoint
              ? `${(crashPoint / 100).toFixed(2)}x`
              : `${(serverMultiplier / 100).toFixed(2)}x`}
          </div>
          {phase === "active" && (
            <div className="text-xs text-zinc-300 font-mono mt-2">
              LIVE
            </div>
          )}
        </div>
      )}

      {/* Explosion particles */}
      {showExplosion && (
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const dist = 60 + Math.random() * 40;
            return (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  left: "50%",
                  top: "50%",
                  background:
                    i % 3 === 0
                      ? "#ff4444"
                      : i % 3 === 1
                        ? "#ff8800"
                        : "#ffdd00",
                  boxShadow: `0 0 6px ${i % 3 === 0 ? "#ff4444" : "#ff8800"}`,
                  animation: "particle-burst 0.8s ease-out forwards",
                  animationDelay: `${i * 30}ms`,
                  "--burst-x": `${Math.cos(angle) * dist}px`,
                  "--burst-y": `${Math.sin(angle) * dist}px`,
                } as React.CSSProperties}
              />
            );
          })}
        </div>
      )}

      {/* Waiting state */}
      {phase === "waiting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <div className="text-6xl font-mono font-black text-zinc-300 tabular-nums mb-2">
            {countdown > 0 ? countdown : "..."}
          </div>
          <div className="text-xs text-zinc-300 font-medium tracking-widest uppercase">
            Next round
          </div>
        </div>
      )}

      {/* Betting state */}
      {phase === "betting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-20"
              style={{
                background:
                  "radial-gradient(circle, #00ff88 0%, transparent 70%)",
                transform: "scale(3)",
              }}
            />
            <div
              className="text-4xl font-black tracking-tight relative"
              style={{
                color: "#00ff88",
                textShadow: "0 0 40px rgba(0,255,136,0.3)",
              }}
            >
              Place your bets
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div
              className="h-2 w-2 rounded-full animate-pulse"
              style={{
                background: "#00ff88",
                boxShadow: "0 0 8px #00ff88",
              }}
            />
            <span className="text-sm text-zinc-300 font-mono">
              Round #{roundId}
            </span>
          </div>
        </div>
      )}

      {/* Phase pill */}
      <div className="absolute top-3 left-3 z-20">
        <div
          className="text-xs font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full flex items-center gap-1.5"
          style={{
            background:
              phase === "active"
                ? `rgba(${color.glow},0.12)`
                : phase === "crashed"
                  ? "rgba(255,68,68,0.12)"
                  : phase === "betting"
                    ? "rgba(0,255,136,0.1)"
                    : "rgba(255,255,255,0.04)",
            color:
              phase === "active"
                ? color.text
                : phase === "crashed"
                  ? "#ff4444"
                  : phase === "betting"
                    ? "#00ff88"
                    : "#a1a1aa",
            border: `1px solid ${
              phase === "active"
                ? `rgba(${color.glow},0.25)`
                : phase === "crashed"
                  ? "rgba(255,68,68,0.25)"
                  : phase === "betting"
                    ? "rgba(0,255,136,0.2)"
                    : "rgba(255,255,255,0.06)"
            }`,
          }}
        >
          {(phase === "active" || phase === "betting") && (
            <span className="relative flex h-1.5 w-1.5">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{
                  backgroundColor:
                    phase === "active" ? color.text : "#00ff88",
                }}
              />
              <span
                className="relative inline-flex rounded-full h-1.5 w-1.5"
                style={{
                  backgroundColor:
                    phase === "active" ? color.text : "#00ff88",
                }}
              />
            </span>
          )}
          {phase === "betting"
            ? "Betting"
            : phase === "active"
              ? "Live"
              : phase === "crashed"
                ? "Crashed"
                : "Waiting"}
        </div>
      </div>

      {/* Round # */}
      {roundId > 0 && (
        <div className="absolute top-3 right-3 z-20 text-xs text-zinc-300 font-mono">
          #{roundId}
        </div>
      )}
    </div>
  );
}

export const CrashDisplay = memo(CrashDisplayInner);
