import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
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
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
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
