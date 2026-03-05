import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "habita_tour_sections";

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
  const [tourSkipped, setTourSkipped] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as TourState;
          setState(parsed);
          const seq = getSequence(isSharedHousehold);
          if (seq.every((s) => parsed[s])) setTourSkipped(true);
        } catch {
          // corrupt data, start fresh
        }
      }
      setIsLoaded(true);
    });
  }, [isSharedHousehold]);

  const sequence = useMemo(() => getSequence(isSharedHousehold), [isSharedHousehold]);

  const activeTourSection = useMemo<TourSection | null>(() => {
    if (tourSkipped) return null;
    return sequence.find((s) => !state[s]) ?? null;
  }, [sequence, state, tourSkipped]);

  const shouldShowTour = isLoaded && activeTourSection !== null;

  const persist = useCallback((next: TourState) => {
    setState(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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

/** Hook to check if a specific section was toured. */
export function useSectionToured(section: TourSection): boolean {
  const [toured, setToured] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<string, boolean>;
          if (parsed[section]) setToured(true);
        } catch {
          // ignore
        }
      }
    });
  }, [section]);

  return toured;
}
