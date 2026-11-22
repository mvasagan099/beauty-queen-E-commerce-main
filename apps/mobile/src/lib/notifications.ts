import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { growthApi } from "./api";

const EXPO_PUSH_TOKEN_KEY = "bq_expo_push_token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function getSavedExpoPushToken(): Promise<string | null> {
  return SecureStore.getItemAsync(EXPO_PUSH_TOKEN_KEY).catch(() => null);
}

export async function registerForAtelierNotifications(): Promise<{
  ok: boolean;
  token?: string;
  reason?: string;
}> {
  if (!Device.isDevice) {
    return {
      ok: false,
      reason: "Push notifications require a physical Android or iOS device.",
    };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("atelier-updates", {
      name: "Beauty Queen Order & Drop Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#A81C44",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return {
      ok: false,
      reason: "Notification permission was not granted.",
    };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const token = tokenData.data;

  await growthApi.registerExpoPushToken({
    token,
    platform: Platform.OS,
    deviceName: Device.modelName || undefined,
  });

  await SecureStore.setItemAsync(EXPO_PUSH_TOKEN_KEY, token).catch(() => undefined);
  return { ok: true, token };
}

export async function unregisterAtelierNotifications(): Promise<void> {
  const token = await getSavedExpoPushToken();
  await growthApi.removeExpoPushToken(token || undefined).catch(() => undefined);
  await SecureStore.deleteItemAsync(EXPO_PUSH_TOKEN_KEY).catch(() => undefined);
}
