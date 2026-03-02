import { useState } from "react";
import { router } from "expo-router";
import { Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import { useMobileAuth } from "@/providers/mobile-auth-provider";

export default function LoginScreen() {
  const { exchangeTokens } = useMobileAuth();
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setError(null);
    if (!accessToken.trim() || !refreshToken.trim()) {
      setError("Ingresá access y refresh token");
      return;
    }
    try {
      await exchangeTokens({
        accessToken: accessToken.trim(),
        refreshToken: refreshToken.trim(),
      });
      router.replace("/(app)/dashboard");
    } catch {
      setError("No se pudo iniciar sesión mobile");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: "#ffffff" }}>
      <View style={{ marginTop: 20, gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "700" }}>Habita Mobile</Text>
        <Text style={{ color: "#666666" }}>
          Fase foundation: pegá tokens emitidos por `/api/auth/mobile/exchange`.
        </Text>
      </View>

      <View style={{ marginTop: 24, gap: 12 }}>
        <TextInput
          placeholder="Access token"
          value={accessToken}
          onChangeText={setAccessToken}
          autoCapitalize="none"
          style={{ borderWidth: 1, borderColor: "#dddddd", borderRadius: 10, padding: 12 }}
        />
        <TextInput
          placeholder="Refresh token"
          value={refreshToken}
          onChangeText={setRefreshToken}
          autoCapitalize="none"
          style={{ borderWidth: 1, borderColor: "#dddddd", borderRadius: 10, padding: 12 }}
        />
        {error ? <Text style={{ color: "#b91c1c" }}>{error}</Text> : null}
        <Pressable
          onPress={() => void handleContinue()}
          style={{
            backgroundColor: "#5260fe",
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "600" }}>Continuar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
