"use client";

import { useRef, useCallback, useState } from "react";

interface SwipeHandlers {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

interface UseSwipeGestureReturn {
  onTouchStart: (event: React.TouchEvent) => void;
  onTouchMove: (event: React.TouchEvent) => void;
  onTouchEnd: () => void;
  /** Current horizontal offset during active drag (px). 0 when idle. */
  dragOffset: number;
}

const SWIPE_THRESHOLD_PX = 50;
const SWIPE_VELOCITY_THRESHOLD = 0.3; // px/ms

export function useSwipeGesture(handlers: SwipeHandlers): UseSwipeGestureReturn {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const [dragOffset, setDragOffset] = useState(0);

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    isHorizontalSwipe.current = null;
    setDragOffset(0);
  }, []);

  const onTouchMove = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
      return;
    }

    if (!isHorizontalSwipe.current) return;

    setDragOffset(deltaX);
  }, []);

  const onTouchEnd = useCallback(() => {
    const elapsed = Date.now() - touchStartTime.current;
    const velocity = Math.abs(dragOffset) / Math.max(elapsed, 1);

    const shouldSwipe =
      Math.abs(dragOffset) > SWIPE_THRESHOLD_PX || velocity > SWIPE_VELOCITY_THRESHOLD;

    if (shouldSwipe && isHorizontalSwipe.current) {
      if (dragOffset < 0) {
        handlers.onSwipeLeft();
      } else {
        handlers.onSwipeRight();
      }
    }

    setDragOffset(0);
    isHorizontalSwipe.current = null;
  }, [dragOffset, handlers]);

  return { onTouchStart, onTouchMove, onTouchEnd, dragOffset };
}
