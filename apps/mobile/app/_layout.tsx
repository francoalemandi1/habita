import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { RuntimeBanner } from "@/components/runtime-banner";
import { MobileQueryProvider } from "@/providers/query-provider";
import { MobileAuthProvider, useMobileAuth } from "@/providers/mobile-auth-provider";

function RootNavigator() {
  const { isBootstrapping } = useMobileAuth();

  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <RuntimeBanner />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <MobileQueryProvider>
      <MobileAuthProvider>
        <RootNavigator />
      </MobileAuthProvider>
    </MobileQueryProvider>
  );
}
