import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "habita_tabs_unlocked";
type UnlockableTab = "discover" | "cocina";

export function useUnlockedTabs() {
  const [unlocked, setUnlocked] = useState<Set<UnlockableTab>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) {
        setUnlocked(new Set(JSON.parse(raw) as UnlockableTab[]));
      }
      setLoaded(true);
    });
  }, []);

  const unlock = async (tab: UnlockableTab) => {
    setUnlocked((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      void AsyncStorage.setItem(KEY, JSON.stringify([...next]));
      return next;
    });
  };

  return { unlocked, loaded, unlock };
}
