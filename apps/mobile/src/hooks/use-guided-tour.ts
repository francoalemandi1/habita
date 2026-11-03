import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "habita_tour_sections";

export type TourSection = "invitar" | "registra" | "ahorra" | "descubri";

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
