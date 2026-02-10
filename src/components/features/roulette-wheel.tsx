"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
}

const SEGMENT_COLORS = [
  "#5260fe",
  "#d0b6ff",
  "#d2ffa0",
  "#ff9f43",
  "#ff6b6b",
  "#54a0ff",
  "#ffd32a",
  "#ff9ff3",
];

/** Text color that contrasts well with each segment background */
const SEGMENT_TEXT_COLORS = [
  "#ffffff",
  "#272727",
  "#272727",
  "#ffffff",
  "#ffffff",
  "#ffffff",
  "#272727",
  "#272727",
];

const SPIN_DURATION_MS = 4000;
const MIN_ROTATIONS = 5;
const WHEEL_SIZE = 300;
const WHEEL_CENTER = WHEEL_SIZE / 2;
/** Max rotation (degrees) the pointer flexes — pivots from its tip */
const MAX_POINTER_FLEX = 22;

/**
 * Returns a smooth flex value based on how close the pointer is to the nearest
 * segment boundary.  The curve ramps up as the pointer approaches a peg, then
 * quickly springs back after crossing it — simulating a flexible flap being
 * pushed aside and snapping back.
 *
 * posInSegment: 0..1 (0 = just entered segment, 1 = about to leave)
 * Returns: -1..1  (negative = bending right as peg approaches from left,
 *                   positive = spring-back after crossing)
 */
function computePointerFlex(posInSegment: number): number {
  // Use a shifted sine so the pointer:
  //  - bends smoothly as a peg approaches (last ~30% of segment)
  //  - snaps back quickly after crossing (first ~20% of next segment)
  // Phase-shifted sine: peak at boundary, decays towards mid-segment
  const phase = posInSegment * Math.PI * 2;
  return -Math.sin(phase);
}

export function RouletteWheel({
  members,
  isSpinning,
  winnerIndex,
  onSpinComplete,
}: RouletteWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const flexRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const prevAngleRef = useRef(0);

  const segmentCount = members.length;
  const segmentAngle = segmentCount > 0 ? 360 / segmentCount : 360;

  // Build conic-gradient string
  const conicGradient =
    members.length > 0
      ? members
          .map((_, i) => {
            const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length]!;
            const startDeg = i * segmentAngle;
            const endDeg = (i + 1) * segmentAngle;
            return `${color} ${startDeg}deg ${endDeg}deg`;
          })
          .join(", ")
      : "#e5e7eb 0deg 360deg";

  // Continuously drive pointer flex by reading computed transform each frame
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

        // Speed: degrees moved since last frame
        let delta = normalizedAngle - prevAngleRef.current;
        // Handle wrap-around (e.g. 359 → 1)
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        prevAngleRef.current = normalizedAngle;

        const absDelta = Math.abs(delta);
        // Speed factor: 0 when still, 1 when spinning fast (>6°/frame ≈ fast spin)
        const speedFactor = Math.min(absDelta / 6, 1);

        // Position within current segment (0..1)
        const posInSegment = (normalizedAngle % segmentAngle) / segmentAngle;
        const flex = computePointerFlex(posInSegment);
        const rotateDeg = flex * MAX_POINTER_FLEX * speedFactor;

        flexRef.current.style.transform = `rotate(${rotateDeg}deg)`;
      }
    }

    rafRef.current = requestAnimationFrame(animatePointer);
  }, [segmentCount, segmentAngle]);

  // Start/stop the pointer animation loop
  useEffect(() => {
    if (isAnimating && segmentCount >= 2) {
      prevAngleRef.current = 0;
      rafRef.current = requestAnimationFrame(animatePointer);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Smoothly return to neutral
      if (flexRef.current) {
        flexRef.current.style.transition = "transform 300ms ease-out";
        flexRef.current.style.transform = "rotate(0deg)";
        // Remove transition after it completes so it doesn't interfere with rAF
        const el = flexRef.current;
        const cleanup = () => {
          el.style.transition = "";
        };
        el.addEventListener("transitionend", cleanup, { once: true });
      }
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isAnimating, segmentCount, animatePointer]);

  // Reset rotation to 0 when not spinning so each spin starts fresh
  useEffect(() => {
    if (!isSpinning && !isAnimating) {
      setRotation(0);
    }
  }, [isSpinning, isAnimating]);

  // Trigger spin animation when isSpinning turns true with a valid winnerIndex
  useEffect(() => {
    if (!isSpinning || winnerIndex < 0 || segmentCount === 0) return;

    // Random position within the winner's segment (avoid edges by 10% padding)
    const padding = segmentAngle * 0.1;
    const randomOffsetInSegment =
      padding + Math.random() * (segmentAngle - padding * 2);

    // Angle where the random point within the winner segment sits
    const winnerLandAngle = winnerIndex * segmentAngle + randomOffsetInSegment;

    // Random number of full rotations (5-9) for visual variety
    const extraRotations = MIN_ROTATIONS + Math.floor(Math.random() * 5);

    // Total rotation: full spins + offset to land winner at the top pointer
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

  return (
    <div
      className="relative mx-auto"
      style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
    >
      {/* Decorative outer ring */}
      <div
        className="absolute -inset-2 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, #5260fe, #d0b6ff, #d2ffa0, #ff9f43, #ff6b6b, #54a0ff, #ffd32a, #ff9ff3, #5260fe)",
          opacity: 0.3,
          filter: "blur(6px)",
        }}
      />

      {/* Pointer — outer div handles positioning, inner div handles flex rotation */}
      <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-2">
        <div
          ref={flexRef}
          style={{ transformOrigin: "center bottom" }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "14px solid transparent",
              borderRight: "14px solid transparent",
              borderTop: "24px solid hsl(var(--foreground))",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
            }}
          />
        </div>
      </div>

      {/* Wheel */}
      <div
        ref={wheelRef}
        className="h-full w-full rounded-full shadow-xl"
        aria-hidden="true"
        style={{
          background: `conic-gradient(from 0deg, ${conicGradient})`,
          transform: `rotate(${rotation}deg)`,
          transition: isAnimating
            ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`
            : "none",
          boxShadow: isAnimating
            ? "0 0 30px rgba(82,96,254,0.3), inset 0 0 20px rgba(0,0,0,0.1)"
            : "0 4px 20px rgba(0,0,0,0.15), inset 0 0 15px rgba(0,0,0,0.05)",
        }}
      >
        {/* Segment divider lines */}
        {members.length > 1 &&
          members.map((_, i) => {
            const angle = i * segmentAngle;
            return (
              <div
                key={`divider-${i}`}
                className="absolute left-1/2 top-0 origin-bottom"
                style={{
                  width: 2,
                  height: WHEEL_CENTER,
                  background: "rgba(255,255,255,0.3)",
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: `50% ${WHEEL_CENTER}px`,
                }}
              />
            );
          })}

        {/* Segment labels */}
        {members.map((member, i) => {
          const labelAngle = i * segmentAngle + segmentAngle / 2;
          const radius = segmentCount <= 3 ? 90 : segmentCount <= 5 ? 95 : 105;
          const radians = ((labelAngle - 90) * Math.PI) / 180;
          const labelX = WHEEL_CENTER + radius * Math.cos(radians);
          const labelY = WHEEL_CENTER + radius * Math.sin(radians);
          const textColor = SEGMENT_TEXT_COLORS[i % SEGMENT_TEXT_COLORS.length]!;
          const firstName = member.name.split(" ")[0] ?? member.name;

          return (
            <div
              key={member.id}
              className="absolute font-bold"
              style={{
                left: labelX,
                top: labelY,
                transform: `translate(-50%, -50%) rotate(${labelAngle}deg)`,
                maxWidth: segmentCount <= 4 ? 80 : 60,
                textAlign: "center",
                lineHeight: "1.1",
                fontSize: segmentCount > 6 ? "0.6rem" : "0.75rem",
                color: textColor,
                textShadow: textColor === "#ffffff"
                  ? "0 1px 3px rgba(0,0,0,0.4)"
                  : "0 1px 2px rgba(255,255,255,0.3)",
              }}
            >
              {firstName}
            </div>
          );
        })}

        {/* Outer dots on dividers (peg effect) */}
        {members.length > 1 &&
          members.map((_, i) => {
            const angle = i * segmentAngle;
            const radians = ((angle - 90) * Math.PI) / 180;
            const dotX = WHEEL_CENTER + (WHEEL_CENTER - 8) * Math.cos(radians);
            const dotY = WHEEL_CENTER + (WHEEL_CENTER - 8) * Math.sin(radians);
            return (
              <div
                key={`dot-${i}`}
                className="absolute rounded-full bg-white/80"
                style={{
                  width: 8,
                  height: 8,
                  left: dotX - 4,
                  top: dotY - 4,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}
              />
            );
          })}
      </div>

      {/* Center circle */}
      <div className="absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-white/50">
        <span className="text-xl" role="img" aria-label="target">
          🎯
        </span>
      </div>

      {/* Empty state overlay */}
      {members.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full">
          <p className="text-sm text-muted-foreground">Elegí una tarea</p>
        </div>
      )}
    </div>
  );
}
