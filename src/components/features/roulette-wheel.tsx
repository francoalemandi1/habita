"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { wheelColors, wheelTextColors } from "@/lib/design-tokens";
import { Sparkles } from "lucide-react";

import type { MemberType } from "@prisma/client";

interface WheelMember {
  id: string;
  name: string;
  memberType: MemberType;
  avatarUrl: string | null;
}

interface RouletteWheelProps {
  members: WheelMember[];
  isSpinning: boolean;
  winnerIndex: number;
  onSpinComplete: () => void;
  onSpin?: () => void;
  canSpin?: boolean;
}

const SPIN_DURATION_MS = 4500;
const MIN_ROTATIONS = 6;
const WHEEL_SIZE_SM = 300;
const WHEEL_SIZE_LG = 360;
/** Max rotation (degrees) the pointer flexes — pivots from its tip */
const MAX_POINTER_FLEX = 22;
/** Number of pegs on the wheel rim */
const PEG_COUNT_BASE = 24;

// ============================================
// Sound & Haptics
// ============================================

/** Audio context for tick sounds — created lazily on first spin */
let audioCtxRef: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtxRef) {
    audioCtxRef = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtxRef;
}

function playTick(volume: number) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
  gainNode.gain.setValueAtTime(volume * 0.12, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.05);
}

function triggerHaptic() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(8);
  }
}

// ============================================
// Pointer flex computation
// ============================================

function computePointerFlex(posInSegment: number): number {
  const phase = posInSegment * Math.PI * 2;
  return -Math.sin(phase);
}

// ============================================
// Component
// ============================================

export function RouletteWheel({
  members,
  isSpinning,
  winnerIndex,
  onSpinComplete,
  onSpin,
  canSpin = false,
}: RouletteWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [wheelSize, setWheelSize] = useState(WHEEL_SIZE_SM);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const flexRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const prevAngleRef = useRef(0);
  const lastPegIndexRef = useRef(-1);

  const segmentCount = members.length;
  const segmentAngle = segmentCount > 0 ? 360 / segmentCount : 360;
  const wheelCenter = wheelSize / 2;
  const pegCount = Math.max(PEG_COUNT_BASE, segmentCount);

  // Responsive wheel size
  useEffect(() => {
    function handleResize() {
      setWheelSize(window.innerWidth >= 640 ? WHEEL_SIZE_LG : WHEEL_SIZE_SM);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Build conic-gradient
  const conicGradient =
    members.length > 0
      ? members
          .map((_, i) => {
            const color = wheelColors[i % wheelColors.length]!;
            const startDeg = i * segmentAngle;
            const endDeg = (i + 1) * segmentAngle;
            return `${color} ${startDeg}deg ${endDeg}deg`;
          })
          .join(", ")
      : "#e5e7eb 0deg 360deg";

  // Pointer animation + sound/haptics
  const animatePointer = useCallback(() => {
    if (!wheelRef.current || !flexRef.current || segmentCount < 2) {
      rafRef.current = requestAnimationFrame(animatePointer);
      return;
    }

    const style = window.getComputedStyle(wheelRef.current);
    const transform = style.transform;

    if (transform && transform !== "none") {
      const match = transform.match(/matrix\(([^)]+)\)/);
      if (match?.[1]) {
        const values = match[1].split(",").map(Number);
        const a = values[0] ?? 0;
        const b = values[1] ?? 0;
        const angleDeg = Math.atan2(b, a) * (180 / Math.PI);
        const normalizedAngle = ((angleDeg % 360) + 360) % 360;

        // Speed
        let delta = normalizedAngle - prevAngleRef.current;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        prevAngleRef.current = normalizedAngle;

        const absDelta = Math.abs(delta);
        const speedFactor = Math.min(absDelta / 6, 1);

        // Position within current segment
        const posInSegment = (normalizedAngle % segmentAngle) / segmentAngle;
        const flex = computePointerFlex(posInSegment);
        const rotateDeg = flex * MAX_POINTER_FLEX * speedFactor;

        flexRef.current.style.transform = `rotate(${rotateDeg}deg)`;

        // Tick sound on peg crossing
        const pegAngle = 360 / pegCount;
        const currentPegIndex = Math.floor(normalizedAngle / pegAngle);
        if (currentPegIndex !== lastPegIndexRef.current && absDelta > 0.5) {
          lastPegIndexRef.current = currentPegIndex;
          playTick(speedFactor);
          if (speedFactor > 0.3) triggerHaptic();
        }
      }
    }

    rafRef.current = requestAnimationFrame(animatePointer);
  }, [segmentCount, segmentAngle, pegCount]);

  // Start/stop pointer animation loop
  useEffect(() => {
    if (isAnimating && segmentCount >= 2) {
      prevAngleRef.current = 0;
      lastPegIndexRef.current = -1;
      rafRef.current = requestAnimationFrame(animatePointer);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (flexRef.current) {
        flexRef.current.style.transition = "transform 300ms ease-out";
        flexRef.current.style.transform = "rotate(0deg)";
        const el = flexRef.current;
        const cleanup = () => { el.style.transition = ""; };
        el.addEventListener("transitionend", cleanup, { once: true });
      }
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isAnimating, segmentCount, animatePointer]);

  // Reset rotation when not spinning
  useEffect(() => {
    if (!isSpinning && !isAnimating) {
      setRotation(0);
    }
  }, [isSpinning, isAnimating]);

  // Trigger spin
  useEffect(() => {
    if (!isSpinning || winnerIndex < 0 || segmentCount === 0) return;

    const padding = segmentAngle * 0.1;
    const randomOffsetInSegment =
      padding + Math.random() * (segmentAngle - padding * 2);
    const winnerLandAngle = winnerIndex * segmentAngle + randomOffsetInSegment;
    const extraRotations = MIN_ROTATIONS + Math.floor(Math.random() * 5);
    const targetAngle = extraRotations * 360 + (360 - winnerLandAngle);

    setIsAnimating(true);
    setRotation(targetAngle);

    timerRef.current = setTimeout(() => {
      setIsAnimating(false);
      onSpinComplete();
    }, SPIN_DURATION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isSpinning, winnerIndex, segmentCount, segmentAngle, onSpinComplete]);

  // Outer ring pegs (decorative dots around the rim)
  const outerPegs = Array.from({ length: pegCount }, (_, i) => {
    const angle = (i * 360) / pegCount;
    const radians = ((angle - 90) * Math.PI) / 180;
    const outerRadius = wheelCenter + 14;
    const pegX = wheelCenter + outerRadius * Math.cos(radians);
    const pegY = wheelCenter + outerRadius * Math.sin(radians);
    return { x: pegX, y: pegY, angle };
  });

  return (
    <div
      className="relative mx-auto"
      style={{ width: wheelSize + 36, height: wheelSize + 36 }}
    >
      {/* Solid outer ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "linear-gradient(135deg, #2d2d3f 0%, #1a1a2e 50%, #2d2d3f 100%)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.1)",
        }}
      />

      {/* Metal pegs on outer ring */}
      {outerPegs.map((peg, i) => (
        <div
          key={`peg-${i}`}
          className="absolute rounded-full"
          style={{
            width: 10,
            height: 10,
            left: peg.x + 18 - 5,
            top: peg.y + 18 - 5,
            background: "linear-gradient(135deg, #e8e8e8 0%, #b0b0b0 50%, #d0d0d0 100%)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.6)",
          }}
        />
      ))}

      {/* Pointer — positioned at top center */}
      <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2" style={{ top: -2 }}>
        <div
          ref={flexRef}
          style={{ transformOrigin: "center bottom" }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "16px solid transparent",
              borderRight: "16px solid transparent",
              borderTop: "28px solid hsl(var(--foreground))",
              filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.3))",
            }}
          />
        </div>
      </div>

      {/* Wheel */}
      <div
        ref={wheelRef}
        className="absolute rounded-full"
        aria-hidden="true"
        style={{
          width: wheelSize,
          height: wheelSize,
          left: 18,
          top: 18,
          background: `conic-gradient(from 0deg, ${conicGradient})`,
          transform: `rotate(${rotation}deg)`,
          transition: isAnimating
            ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.15, 0.60, 0.08, 1.00)`
            : "none",
          boxShadow: isAnimating
            ? "0 0 40px rgba(82,96,254,0.4), inset 0 0 30px rgba(0,0,0,0.15)"
            : "0 4px 24px rgba(0,0,0,0.2), inset 0 0 20px rgba(0,0,0,0.08)",
        }}
      >
        {/* Segment divider lines */}
        {members.length > 1 &&
          members.map((_, i) => {
            const angle = i * segmentAngle;
            return (
              <div
                key={`divider-${i}`}
                className="absolute left-1/2"
                style={{
                  width: 2,
                  height: wheelCenter,
                  top: 0,
                  background: "rgba(255,255,255,0.25)",
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: `50% ${wheelCenter}px`,
                }}
              />
            );
          })}

        {/* Segment labels — radial, always readable */}
        {members.map((member, i) => {
          const labelAngle = i * segmentAngle + segmentAngle / 2;
          const radius = segmentCount <= 3 ? wheelCenter * 0.55 : segmentCount <= 5 ? wheelCenter * 0.6 : wheelCenter * 0.65;
          const radians = ((labelAngle - 90) * Math.PI) / 180;
          const labelX = wheelCenter + radius * Math.cos(radians);
          const labelY = wheelCenter + radius * Math.sin(radians);
          const textColor = wheelTextColors[i % wheelTextColors.length]!;
          const firstName = member.name.split(" ")[0] ?? member.name;

          // Keep text upright: if the label would be upside-down, rotate 180°
          let textRotation = labelAngle;
          if (textRotation > 90 && textRotation < 270) {
            textRotation += 180;
          }

          return (
            <div
              key={member.id}
              className="absolute font-bold"
              style={{
                left: labelX,
                top: labelY,
                transform: `translate(-50%, -50%) rotate(${textRotation}deg)`,
                maxWidth: segmentCount <= 4 ? 90 : 70,
                textAlign: "center",
                lineHeight: "1.1",
                fontSize: segmentCount > 8 ? "0.6rem" : segmentCount > 5 ? "0.7rem" : "0.85rem",
                color: textColor,
                textShadow: textColor === "#ffffff"
                  ? "0 1px 3px rgba(0,0,0,0.5)"
                  : "0 1px 2px rgba(255,255,255,0.4)",
                letterSpacing: "0.02em",
              }}
            >
              {firstName}
            </div>
          );
        })}

        {/* Inner dots on segment boundaries (near center) */}
        {members.length > 1 &&
          members.map((_, i) => {
            const angle = i * segmentAngle;
            const radians = ((angle - 90) * Math.PI) / 180;
            const dotRadius = wheelCenter - 12;
            const dotX = wheelCenter + dotRadius * Math.cos(radians);
            const dotY = wheelCenter + dotRadius * Math.sin(radians);
            return (
              <div
                key={`dot-${i}`}
                className="absolute rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  left: dotX - 3,
                  top: dotY - 3,
                  background: "rgba(255,255,255,0.5)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                }}
              />
            );
          })}
      </div>

      {/* Center button */}
      <button
        type="button"
        onClick={onSpin}
        disabled={!canSpin}
        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
        style={{
          width: wheelSize * 0.22,
          height: wheelSize * 0.22,
        }}
      >
        <div
          className={`flex h-full w-full items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-white/50 transition-transform duration-200 ${
            canSpin ? "hover:scale-110 active:scale-95 cursor-pointer" : "opacity-60"
          }`}
          style={{
            boxShadow: canSpin
              ? "0 4px 20px rgba(82,96,254,0.3), 0 2px 8px rgba(0,0,0,0.15)"
              : "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {isAnimating ? (
            <div
              className="rounded-full border-2 border-primary border-t-transparent"
              style={{
                width: wheelSize * 0.08,
                height: wheelSize * 0.08,
                animation: "spin 0.8s linear infinite",
              }}
            />
          ) : (
            <Sparkles
              className="text-primary"
              style={{
                width: wheelSize * 0.09,
                height: wheelSize * 0.09,
              }}
            />
          )}
        </div>
      </button>

      {/* Empty state overlay */}
      {members.length === 0 && (
        <div
          className="absolute flex items-center justify-center rounded-full"
          style={{
            width: wheelSize,
            height: wheelSize,
            left: 18,
            top: 18,
          }}
        >
          <p className="text-sm text-muted-foreground">Elegí una tarea</p>
        </div>
      )}
    </div>
  );
}
