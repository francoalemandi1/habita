import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "habita_mobile_dismissed_detected_services";

async function readDismissed(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
  } catch (error) {
    console.warn("plata-detected-dismiss-store: could not read dismissed services", error);
    return new Set();
  }
}

/**
 * "No es mía" has no dismiss endpoint (§11, no backend changes) — remembered
 * on-device only, so the detected invoice reappears after a scan on another
 * device or once the app's storage is cleared.
 */
export async function getDismissedDetectedServices(): Promise<Set<string>> {
  return readDismissed();
}

export async function dismissDetectedService(key: string): Promise<void> {
  const dismissed = await readDismissed();
  dismissed.add(key);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
  } catch (error) {
    console.warn("dismissDetectedService: could not persist dismissal", error);
  }
}
