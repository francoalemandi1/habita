import { Stack } from "expo-router";
export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: "#111111",
      }}
    >
      <Stack.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          headerRight: () => null,
        }}
      />
      <Stack.Screen name="expenses" options={{ title: "Registrá" }} />
      <Stack.Screen name="new-expense" options={{ title: "Nuevo gasto" }} />
      <Stack.Screen
        name="settings"
        options={{
          title: "Sesión",
          headerRight: () => null,
        }}
      />
    </Stack>
  );
}
