import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "habita_mobile_access_token";
const REFRESH_TOKEN_KEY = "habita_mobile_refresh_token";
const HOUSEHOLD_ID_KEY = "habita_mobile_household_id";

export interface MobileSessionSnapshot {
  accessToken: string | null;
  refreshToken: string | null;
  householdId: string | null;
}

export async function getMobileSessionSnapshot(): Promise<MobileSessionSnapshot> {
  const [accessToken, refreshToken, householdId] = await Promise.all([
    AsyncStorage.getItem(ACCESS_TOKEN_KEY),
    AsyncStorage.getItem(REFRESH_TOKEN_KEY),
    AsyncStorage.getItem(HOUSEHOLD_ID_KEY),
  ]);

  return { accessToken, refreshToken, householdId };
}

export async function setMobileTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
    AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
  ]);
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
    AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
    AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
    AsyncStorage.removeItem(HOUSEHOLD_ID_KEY),
  ]);
}
