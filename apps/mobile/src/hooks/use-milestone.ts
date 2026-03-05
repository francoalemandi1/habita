import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_PREFIX = "habita_milestone:";

export type MilestoneKey =
  | "first-expense"
  | "first-search"
  | "first-recipe"
  | "first-event-saved"
  | "first-invite-sent";

export function useMilestone(key: MilestoneKey) {
  const storageKey = `${KEY_PREFIX}${key}`;
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(storageKey).then((value) => {
      if (value === "1") setIsCompleted(true);
    });
  }, [storageKey]);

  const complete = useCallback(async () => {
    const existing = await AsyncStorage.getItem(storageKey);
    if (existing === "1") return false;
    await AsyncStorage.setItem(storageKey, "1");
    setIsCompleted(true);
    return true; // was the first time
  }, [storageKey]);

  return { isCompleted, complete };
}
