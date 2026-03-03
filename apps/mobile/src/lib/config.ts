export const mobileConfig = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001",
  // Always HTTPS — used for OAuth flows that require ASWebAuthenticationSession
  oauthBaseUrl: process.env.EXPO_PUBLIC_OAUTH_BASE_URL ?? "https://habita.casa",
  google: {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "",
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
  },
} as const;
