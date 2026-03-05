"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "habita:tour-sections";

export type TourSection = "invitar" | "registra" | "ahorra" | "descubri" | "cocina";

interface TourState {
  invitar: boolean;
  registra: boolean;
  ahorra: boolean;
  descubri: boolean;
  cocina: boolean;
}

const DEFAULT_STATE: TourState = {
  invitar: false,
  registra: false,
  ahorra: false,
  descubri: false,
  cocina: false,
};

function getSequence(isSharedHousehold: boolean): TourSection[] {
  const sections: TourSection[] = ["registra", "ahorra", "descubri", "cocina"];
  if (isSharedHousehold) sections.unshift("invitar");
  return sections;
}

export function useGuidedTour(isSharedHousehold: boolean) {
  const [state, setState] = useState<TourState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  // Track whether the tour was explicitly completed/skipped (all sections marked)
  const [tourSkipped, setTourSkipped] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as TourState;
        setState(parsed);
        // Check if all relevant sections are already toured
        const seq = getSequence(isSharedHousehold);
        if (seq.every((s) => parsed[s])) setTourSkipped(true);
      } catch {
        // corrupt data, start fresh
      }
    }
    setIsLoaded(true);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [isSharedHousehold]);

  const sequence = useMemo(() => getSequence(isSharedHousehold), [isSharedHousehold]);

  const activeTourSection = useMemo<TourSection | null>(() => {
    if (tourSkipped) return null;
    return sequence.find((s) => !state[s]) ?? null;
  }, [sequence, state, tourSkipped]);

  const shouldShowTour = isLoaded && activeTourSection !== null;

  const persist = useCallback((next: TourState) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const markSectionToured = useCallback((section: TourSection) => {
    const next = { ...state, [section]: true };
    persist(next);
  }, [state, persist]);

  const advanceToNext = useCallback(() => {
    if (!activeTourSection) return;
    markSectionToured(activeTourSection);
  }, [activeTourSection, markSectionToured]);

  const skipTour = useCallback(() => {
    const allTrue: TourState = { invitar: true, registra: true, ahorra: true, descubri: true, cocina: true };
    persist(allTrue);
    setTourSkipped(true);
  }, [persist]);

  const isSectionToured = useCallback((section: TourSection) => state[section], [state]);

  const getTourStepNumber = useCallback((section: TourSection) => {
    return sequence.indexOf(section) + 1;
  }, [sequence]);

  return {
    activeTourSection,
    shouldShowTour,
    markSectionToured,
    advanceToNext,
    skipTour,
    isSectionToured,
    isLoaded,
    totalSteps: sequence.length,
    getTourStepNumber,
  };
}

/** Check if a section was toured (non-hook, reads localStorage directly). */
export function wasSectionToured(section: TourSection): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return !!parsed[section];
  } catch {
    return false;
  }
}
