import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// Sensitive keys — stored in SecureStore (Keychain on iOS, EncryptedSharedPreferences on Android)
const ACCESS_TOKEN_KEY = "habita_mobile_access_token";
const REFRESH_TOKEN_KEY = "habita_mobile_refresh_token";
const TOKEN_EXPIRES_AT_KEY = "habita_mobile_token_expires_at";

// Non-sensitive keys — stored in AsyncStorage
const HOUSEHOLD_ID_KEY = "habita_mobile_household_id";
const DEVICE_ID_KEY = "habita_mobile_device_id";

export interface MobileSessionSnapshot {
  accessToken: string | null;
  refreshToken: string | null;
  householdId: string | null;
}

/**
 * One-time migration: move tokens from AsyncStorage to SecureStore.
 * Call once at app startup before reading tokens.
 */
export async function migrateTokensToSecureStore(): Promise<void> {
  const legacy = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (!legacy) return;

  const [refreshToken, expiresAt] = await Promise.all([
    AsyncStorage.getItem(REFRESH_TOKEN_KEY),
    AsyncStorage.getItem(TOKEN_EXPIRES_AT_KEY),
  ]);

  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, legacy),
    refreshToken ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken) : Promise.resolve(),
    expiresAt ? SecureStore.setItemAsync(TOKEN_EXPIRES_AT_KEY, expiresAt) : Promise.resolve(),
  ]);

  await Promise.all([
    AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
    AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
    AsyncStorage.removeItem(TOKEN_EXPIRES_AT_KEY),
  ]);
}

export async function getMobileSessionSnapshot(): Promise<MobileSessionSnapshot> {
  const [accessToken, refreshToken, householdId] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    AsyncStorage.getItem(HOUSEHOLD_ID_KEY),
  ]);

  return { accessToken, refreshToken, householdId };
}

export async function setMobileTokens(
  accessToken: string,
  refreshToken: string,
  expiresInSeconds?: number,
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    expiresInSeconds
      ? SecureStore.setItemAsync(TOKEN_EXPIRES_AT_KEY, String(Date.now() + expiresInSeconds * 1000))
      : Promise.resolve(),
  ]);
}

export async function getTokenExpiresAt(): Promise<number | null> {
  const raw = await SecureStore.getItemAsync(TOKEN_EXPIRES_AT_KEY);
  return raw ? Number(raw) : null;
}

export async function setActiveHousehold(householdId: string | null): Promise<void> {
  if (!householdId) {
    await AsyncStorage.removeItem(HOUSEHOLD_ID_KEY);
    return;
  }
  await AsyncStorage.setItem(HOUSEHOLD_ID_KEY, householdId);
}

export async function clearMobileSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(TOKEN_EXPIRES_AT_KEY),
    AsyncStorage.removeItem(HOUSEHOLD_ID_KEY),
    AsyncStorage.removeItem(DEVICE_ID_KEY),
  ]);
}

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated = `device_${Date.now()}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}
