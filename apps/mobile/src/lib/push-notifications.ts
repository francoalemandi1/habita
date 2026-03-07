import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { mobileApi } from "./api";
import { getOrCreateDeviceId } from "./storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request permission and register the Expo push token with the backend.
 * Returns true if successful, false if denied or unsupported.
 */
export async function registerForPushNotifications(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return false;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: "a3d7e0b6-2f7c-4a38-b53f-4b9c54f4f14d",
  });

  const deviceId = await getOrCreateDeviceId();

  await mobileApi.post("/api/push-tokens", {
    token: tokenData.data,
    deviceId,
    platform: Platform.OS,
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Habita",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2F6B4F",
    });
  }

  return true;
}

/**
 * Remove the push token from the backend (call on logout).
 */
export async function deregisterPushToken(): Promise<void> {
  try {
    const deviceId = await getOrCreateDeviceId();
    await mobileApi.post("/api/push-tokens/deregister", { deviceId });
  } catch {
    // best effort
  }
}

/**
 * Check the current push permission status.
 */
export async function getPushPermissionStatus(): Promise<"granted" | "denied" | "undetermined"> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}
