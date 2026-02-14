"use client";

/**
 * SVG Mascots for Moon or Doom
 *
 * Three characters:
 * 1. Astronaut — Human player (Moon side)
 * 2. AI Eye — Claude (the opponent)
 * 3. Doom Skull — Crash explosion
 */

interface MascotProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

/** Astronaut Helmet — represents human players */
export function AstronautMascot({ size = 48, className = "", animate = true }: MascotProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        filter: animate ? "drop-shadow(0 0 8px rgba(59,130,246,0.4))" : undefined,
        animation: animate ? "mascot-float 3s ease-in-out infinite" : undefined,
      }}
    >
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
        {/* Helmet outer shell */}
        <ellipse cx="32" cy="30" rx="22" ry="24" fill="#1a1a2e" stroke="#3b82f6" strokeWidth="2" />
        <ellipse cx="32" cy="30" rx="22" ry="24" fill="url(#helmet-sheen)" opacity="0.3" />

        {/* Visor */}
        <ellipse cx="32" cy="28" rx="16" ry="16" fill="#0c1222" stroke="#60a5fa" strokeWidth="1.5" />
        {/* Visor reflection */}
        <ellipse cx="26" cy="22" rx="6" ry="8" fill="url(#visor-reflect)" opacity="0.5" />
        <ellipse cx="38" cy="34" rx="3" ry="4" fill="url(#visor-reflect2)" opacity="0.25" />

        {/* Visor inner glow — the "face" hint */}
        <circle cx="27" cy="26" r="2.5" fill="#3b82f6" opacity="0.6" />
        <circle cx="37" cy="26" r="2.5" fill="#3b82f6" opacity="0.6" />
        <path d="M28 33 Q32 36 36 33" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />

        {/* Helmet ridge */}
        <path d="M15 38 Q32 48 49 38" stroke="#3b82f6" strokeWidth="1.5" fill="none" opacity="0.6" />

        {/* Antenna */}
        <line x1="32" y1="6" x2="32" y2="2" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="32" cy="2" r="2" fill="#3b82f6">
          {animate && <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />}
        </circle>

        {/* Neck piece */}
        <rect x="22" y="50" width="20" height="8" rx="3" fill="#1a1a2e" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="26" y1="52" x2="26" y2="56" stroke="#3b82f6" strokeWidth="0.8" opacity="0.4" />
        <line x1="32" y1="52" x2="32" y2="56" stroke="#3b82f6" strokeWidth="0.8" opacity="0.4" />
        <line x1="38" y1="52" x2="38" y2="56" stroke="#3b82f6" strokeWidth="0.8" opacity="0.4" />

        <defs>
          <linearGradient id="helmet-sheen" x1="20" y1="10" x2="44" y2="50">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <radialGradient id="visor-reflect" cx="0.3" cy="0.3">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="visor-reflect2" cx="0.5" cy="0.5">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

/** AI Eye — represents Claude */
export function AIEyeMascot({ size = 48, className = "", animate = true }: MascotProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        filter: animate ? "drop-shadow(0 0 10px rgba(168,85,247,0.5))" : undefined,
        animation: animate ? "mascot-float 3s ease-in-out infinite 0.5s" : undefined,
      }}
    >
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
        {/* Outer hexagonal frame */}
        <polygon
          points="32,4 56,18 56,46 32,60 8,46 8,18"
          fill="#1a0a2e"
          stroke="#a855f7"
          strokeWidth="1.5"
        />
        <polygon
          points="32,4 56,18 56,46 32,60 8,46 8,18"
          fill="url(#hex-glow)"
          opacity="0.2"
        />

        {/* Inner circuit ring */}
        <circle cx="32" cy="32" r="18" fill="none" stroke="#7c3aed" strokeWidth="1" opacity="0.5" strokeDasharray="4 3" >
          {animate && <animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="20s" repeatCount="indefinite" />}
        </circle>

        {/* Eye shape */}
        <path d="M14 32 Q32 16 50 32 Q32 48 14 32Z" fill="#2a0845" stroke="#c084fc" strokeWidth="1.5" />

        {/* Iris */}
        <circle cx="32" cy="32" r="10" fill="url(#iris-gradient)" stroke="#a855f7" strokeWidth="1" />

        {/* Pupil */}
        <circle cx="32" cy="32" r="5" fill="#1a0a2e" />
        <circle cx="32" cy="32" r="5" fill="url(#pupil-glow)" />

        {/* Pupil core — the "thinking" light */}
        <circle cx="32" cy="32" r="2.5" fill="#c084fc">
          {animate && <animate attributeName="r" values="2.5;3.5;2.5" dur="2s" repeatCount="indefinite" />}
          {animate && <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />}
        </circle>

        {/* Eye highlight */}
        <circle cx="28" cy="28" r="2" fill="white" opacity="0.3" />

        {/* Neural connection lines */}
        <line x1="14" y1="18" x2="22" y2="24" stroke="#7c3aed" strokeWidth="0.8" opacity="0.4" />
        <line x1="50" y1="18" x2="42" y2="24" stroke="#7c3aed" strokeWidth="0.8" opacity="0.4" />
        <line x1="14" y1="46" x2="22" y2="40" stroke="#7c3aed" strokeWidth="0.8" opacity="0.4" />
        <line x1="50" y1="46" x2="42" y2="40" stroke="#7c3aed" strokeWidth="0.8" opacity="0.4" />

        {/* Corner dots — data nodes */}
        <circle cx="14" cy="18" r="1.5" fill="#a855f7" opacity="0.6">
          {animate && <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />}
        </circle>
        <circle cx="50" cy="18" r="1.5" fill="#a855f7" opacity="0.6">
          {animate && <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" begin="0.4s" />}
        </circle>
        <circle cx="14" cy="46" r="1.5" fill="#a855f7" opacity="0.6">
          {animate && <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" begin="0.8s" />}
        </circle>
        <circle cx="50" cy="46" r="1.5" fill="#a855f7" opacity="0.6">
          {animate && <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" begin="1.2s" />}
        </circle>

        <defs>
          <radialGradient id="hex-glow" cx="0.5" cy="0.5">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="iris-gradient" cx="0.5" cy="0.5">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="60%" stopColor="#4c1d95" />
            <stop offset="100%" stopColor="#2a0845" />
          </radialGradient>
          <radialGradient id="pupil-glow" cx="0.5" cy="0.5">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

/** Doom Skull — crash/explosion mascot */
export function DoomSkullMascot({ size = 48, className = "", animate = true }: MascotProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        filter: animate ? "drop-shadow(0 0 12px rgba(239,68,68,0.6))" : undefined,
        animation: animate ? "doom-pulse 1s ease-in-out infinite" : undefined,
      }}
    >
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
        {/* Skull shape */}
        <path
          d="M32 6 C16 6 8 18 8 30 C8 40 14 46 18 48 L18 56 L26 56 L26 52 L30 56 L34 56 L38 52 L38 56 L46 56 L46 48 C50 46 56 40 56 30 C56 18 48 6 32 6Z"
          fill="#1a0a0a"
          stroke="#ef4444"
          strokeWidth="2"
        />
        <path
          d="M32 6 C16 6 8 18 8 30 C8 40 14 46 18 48 L18 56 L26 56 L26 52 L30 56 L34 56 L38 52 L38 56 L46 56 L46 48 C50 46 56 40 56 30 C56 18 48 6 32 6Z"
          fill="url(#skull-glow)"
          opacity="0.15"
        />

        {/* Left eye socket */}
        <path d="M20 24 L26 20 L30 28 L24 32Z" fill="#ef4444" opacity="0.8">
          {animate && <animate attributeName="opacity" values="0.8;1;0.8" dur="0.5s" repeatCount="indefinite" />}
        </path>

        {/* Right eye socket */}
        <path d="M44 24 L38 20 L34 28 L40 32Z" fill="#ef4444" opacity="0.8">
          {animate && <animate attributeName="opacity" values="0.8;1;0.8" dur="0.5s" repeatCount="indefinite" begin="0.25s" />}
        </path>

        {/* Nose */}
        <path d="M30 36 L32 34 L34 36 L32 38Z" fill="#ef4444" opacity="0.5" />

        {/* Teeth */}
        <path d="M22 42 L42 42" stroke="#ef4444" strokeWidth="1.5" />
        <line x1="26" y1="42" x2="26" y2="46" stroke="#ef4444" strokeWidth="1" opacity="0.7" />
        <line x1="30" y1="42" x2="30" y2="47" stroke="#ef4444" strokeWidth="1" opacity="0.7" />
        <line x1="34" y1="42" x2="34" y2="47" stroke="#ef4444" strokeWidth="1" opacity="0.7" />
        <line x1="38" y1="42" x2="38" y2="46" stroke="#ef4444" strokeWidth="1" opacity="0.7" />

        {/* Cracks */}
        <path d="M32 6 L30 14 L34 18 L31 22" stroke="#ef4444" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
        <path d="M48 14 L44 20 L46 24" stroke="#ef4444" strokeWidth="0.8" opacity="0.3" strokeLinecap="round" />

        <defs>
          <radialGradient id="skull-glow" cx="0.5" cy="0.4">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

/** Rocket — used in active phase, heading to the moon */
export function RocketMascot({ size = 32, className = "", animate = true }: MascotProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        filter: animate ? "drop-shadow(0 0 6px rgba(0,255,136,0.5))" : undefined,
      }}
    >
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
        {/* Rocket body */}
        <path d="M16 2 C16 2 10 10 10 20 L22 20 C22 10 16 2 16 2Z" fill="#e4e4e7" stroke="#a1a1aa" strokeWidth="0.8" />
        {/* Nose cone highlight */}
        <path d="M16 2 C16 2 13 8 12 14 L16 12Z" fill="white" opacity="0.3" />
        {/* Window */}
        <circle cx="16" cy="13" r="3" fill="#0c1222" stroke="#60a5fa" strokeWidth="0.8" />
        <circle cx="15" cy="12" r="1" fill="#93c5fd" opacity="0.5" />
        {/* Fins */}
        <path d="M10 18 L6 24 L10 22Z" fill="#ef4444" stroke="#ef4444" strokeWidth="0.5" />
        <path d="M22 18 L26 24 L22 22Z" fill="#ef4444" stroke="#ef4444" strokeWidth="0.5" />
        {/* Engine */}
        <rect x="12" y="20" width="8" height="3" rx="1" fill="#71717a" />
        {/* Flame */}
        <path d="M13 23 Q16 30 19 23" fill="#ff8800" opacity="0.9">
          {animate && <animate attributeName="d" values="M13 23 Q16 30 19 23;M13 23 Q16 32 19 23;M13 23 Q16 30 19 23" dur="0.3s" repeatCount="indefinite" />}
        </path>
        <path d="M14 23 Q16 28 18 23" fill="#ffdd00" opacity="0.8">
          {animate && <animate attributeName="d" values="M14 23 Q16 28 18 23;M14 23 Q16 30 18 23;M14 23 Q16 28 18 23" dur="0.2s" repeatCount="indefinite" />}
        </path>
      </svg>
    </div>
  );
}
