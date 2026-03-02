import { useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useJoinHousehold } from "@/hooks/use-households";
import { semanticColors } from "@habita/design-tokens";

export default function JoinHouseholdScreen() {
  const { hydrate } = useMobileAuth();
  const joinHousehold = useJoinHousehold();

  const [inviteCode, setInviteCode] = useState("");
  const [memberName, setMemberName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isValid = inviteCode.trim().length > 0 && memberName.trim().length > 0;

  const handleJoin = async () => {
    setError(null);
    try {
      await joinHousehold.mutateAsync({
        inviteCode: inviteCode.trim().toUpperCase(),
        memberName: memberName.trim(),
      });
      await hydrate();
      router.replace("/(app)/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo unir al hogar.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View style={{ padding: 24, gap: 24 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: "#111111" }}>
            Unirte a un hogar
          </Text>
          <Text style={{ fontSize: 15, color: "#6b7280" }}>
            Ingresá el código que te compartió tu familia o compañeros de hogar.
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>
              Código de invitación
            </Text>
            <TextInput
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              placeholder="Ej: ABCD1234"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              style={{
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 10,
                padding: 12,
                fontSize: 18,
                fontWeight: "700",
                letterSpacing: 2,
                color: "#111111",
              }}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>
              Tu nombre
            </Text>
            <TextInput
              value={memberName}
              onChangeText={setMemberName}
              placeholder="Ej: Franco"
              placeholderTextColor="#9ca3af"
              style={{
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 10,
                padding: 12,
                fontSize: 15,
                color: "#111111",
              }}
            />
          </View>
        </View>

        {error ? (
          <Text style={{ color: "#b91c1c", fontSize: 14 }}>{error}</Text>
        ) : null}

        <Pressable
          onPress={() => void handleJoin()}
          disabled={!isValid || joinHousehold.isPending}
          style={{
            backgroundColor: semanticColors.primary,
            borderRadius: 10,
            paddingVertical: 14,
            alignItems: "center",
            opacity: !isValid || joinHousehold.isPending ? 0.6 : 1,
          }}
        >
          {joinHousehold.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 16 }}>
              Unirme al hogar
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={{ alignItems: "center", paddingVertical: 4 }}
        >
          <Text style={{ color: "#6b7280", fontSize: 14 }}>Volver</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
