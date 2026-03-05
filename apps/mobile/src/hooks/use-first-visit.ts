import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_PREFIX = "habita_first_visit:";

export function useFirstVisit(section: string): { isFirstVisit: boolean; dismiss: () => void } {
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    const key = `${KEY_PREFIX}${section}`;
    void AsyncStorage.getItem(key).then((value) => {
      if (value === null) {
        setIsFirstVisit(true);
      }
    });
  }, [section]);

  const dismiss = () => {
    setIsFirstVisit(false);
    void AsyncStorage.setItem(`${KEY_PREFIX}${section}`, "dismissed");
  };

  return { isFirstVisit, dismiss };
}

/** Clear all first-visit keys so guides show again */
export async function resetAllGuides(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const guideKeys = allKeys.filter((k) => k.startsWith(KEY_PREFIX));
  if (guideKeys.length > 0) {
    await AsyncStorage.multiRemove(guideKeys);
  }
}
