import { SafeAreaView, Text } from "react-native";

export default function SettingsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Sesión mobile</Text>
      <Text style={{ marginTop: 8, color: "#666666" }}>
        Este espacio queda listo para exchange/refresh/logout visual en próximas iteraciones.
      </Text>
    </SafeAreaView>
  );
}
