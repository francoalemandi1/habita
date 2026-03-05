"use client";

import { useEffect, useState } from "react";
import { WeeklyCelebration } from "./weekly-celebration";

interface WeeklyCelebrationWrapperProps {
  weeklyCompleted: number;
  totalCompleted: number;
}

const CELEBRATION_STORAGE_KEY = "habita-celebration-dismissed";

function wasDismissedThisWeek(): boolean {
  const storedDate = localStorage.getItem(CELEBRATION_STORAGE_KEY);
  if (!storedDate) return false;
  const dismissedDate = new Date(storedDate);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return dismissedDate >= startOfWeek;
}

export function WeeklyCelebrationWrapper({
  weeklyCompleted,
  totalCompleted,
}: WeeklyCelebrationWrapperProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden to match SSR

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    setDismissed(wasDismissedThisWeek());
  // eslint-disable-next-line react-hooks/set-state-in-effect
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(CELEBRATION_STORAGE_KEY, new Date().toISOString());
  };

  if (dismissed) {
    return null;
  }

  return (
    <WeeklyCelebration
      weeklyCompleted={weeklyCompleted}
      totalCompleted={totalCompleted}
      onDismiss={handleDismiss}
    />
  );
}
