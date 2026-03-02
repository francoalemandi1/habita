import { router } from "expo-router";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { useMobileAuth } from "@/providers/mobile-auth-provider";

export default function DashboardScreen() {
  const { me, logout } = useMobileAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", padding: 20 }}>
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: "700" }}>Hola{me?.name ? `, ${me.name}` : ""}</Text>
        <Text style={{ color: "#666666" }}>
          Foundation mobile lista. Probá el vertical de gastos.
        </Text>
      </View>

      <View style={{ marginTop: 24, gap: 12 }}>
        <Pressable
          onPress={() => router.push("/(app)/expenses")}
          style={{ backgroundColor: "#5260fe", borderRadius: 10, padding: 14 }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "600", textAlign: "center" }}>Ir a Registrá (gastos)</Text>
        </Pressable>
        <Pressable
          onPress={async () => {
            await logout();
            router.replace("/(auth)/login");
          }}
          style={{ backgroundColor: "#f3f4f6", borderRadius: 10, padding: 14 }}
        >
          <Text style={{ color: "#111111", fontWeight: "600", textAlign: "center" }}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
