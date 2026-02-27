"use client";

import { useRef, useCallback, useState } from "react";

interface UseSwipeToActionOptions {
  /** Pixel threshold to trigger the action. Default: 100. */
  threshold?: number;
  /** Whether swipe is enabled. Default: true. */
  enabled?: boolean;
}

interface UseSwipeToActionReturn {
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  /** Current horizontal offset in px (positive = rightward). 0 when idle. */
  offset: number;
  /** True if the current swipe has exceeded the activation threshold. */
  isActivated: boolean;
  /** True while the snap-away animation is playing (after activation). */
  isSnapping: boolean;
}

const DEFAULT_THRESHOLD_PX = 100;
const VELOCITY_THRESHOLD = 0.3; // px/ms — fast flick counts as activation

export function useSwipeToAction(
  onAction: () => void,
  options: UseSwipeToActionOptions = {},
): UseSwipeToActionReturn {
  const { threshold = DEFAULT_THRESHOLD_PX, enabled = true } = options;

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const [offset, setOffset] = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);

  const isActivated = offset > threshold;

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || isSnapping) return;
      const touch = e.touches[0];
      if (!touch) return;
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      touchStartTime.current = Date.now();
      isHorizontalSwipe.current = null;
      setOffset(0);
    },
    [enabled, isSnapping],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || isSnapping) return;
      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // Determine direction on first significant movement
      if (isHorizontalSwipe.current === null) {
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
          isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
        }
        return;
      }

      if (!isHorizontalSwipe.current) return;

      // Only allow rightward swipe (positive offset)
      const clampedOffset = Math.max(0, deltaX);
      setOffset(clampedOffset);
    },
    [enabled, isSnapping],
  );

  const onTouchEnd = useCallback(() => {
    if (!enabled || isSnapping) return;

    const elapsed = Date.now() - touchStartTime.current;
    const velocity = offset / Math.max(elapsed, 1);

    const shouldActivate =
      isHorizontalSwipe.current && (offset > threshold || velocity > VELOCITY_THRESHOLD);

    if (shouldActivate) {
      // Snap the card away to the right
      setIsSnapping(true);
      setOffset(window.innerWidth);

      // Fire the action after the snap animation completes
      setTimeout(() => {
        onAction();
        setOffset(0);
        setIsSnapping(false);
      }, 300);
    } else {
      // Spring back to original position
      setOffset(0);
    }

    isHorizontalSwipe.current = null;
  }, [enabled, isSnapping, offset, threshold, onAction]);

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
    offset,
    isActivated,
    isSnapping,
  };
}
