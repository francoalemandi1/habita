import { useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useCreateHousehold } from "@/hooks/use-households";
import { semanticColors } from "@habita/design-tokens";

type MemberType = "ADULT" | "TEEN" | "CHILD";

const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  ADULT: "Adulto",
  TEEN: "Adolescente",
  CHILD: "Niño/a",
};

export default function OnboardingScreen() {
  const { hydrate } = useMobileAuth();
  const createHousehold = useCreateHousehold();

  const [householdName, setHouseholdName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberType, setMemberType] = useState<MemberType>("ADULT");
  const [error, setError] = useState<string | null>(null);

  const isValid = householdName.trim().length > 0 && memberName.trim().length > 0;

  const handleCreate = async () => {
    setError(null);
    try {
      await createHousehold.mutateAsync({
        householdName: householdName.trim(),
        memberName: memberName.trim(),
        memberType,
      });
      await hydrate();
      router.replace("/(app)/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el hogar.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 24 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: "#111111" }}>
            Creá tu hogar
          </Text>
          <Text style={{ fontSize: 15, color: "#6b7280" }}>
            Configurá tu espacio y empezá a organizar las tareas del hogar.
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>
              Nombre del hogar
            </Text>
            <TextInput
              value={householdName}
              onChangeText={setHouseholdName}
              placeholder="Ej: Casa de los García"
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

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>
              Tipo de miembro
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["ADULT", "TEEN", "CHILD"] as MemberType[]).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setMemberType(type)}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: memberType === type ? semanticColors.primary : "#e5e7eb",
                    backgroundColor: memberType === type ? "#eff6ff" : "#ffffff",
                    borderRadius: 8,
                    paddingVertical: 8,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: memberType === type ? "700" : "500",
                      color: memberType === type ? semanticColors.primary : "#6b7280",
                    }}
                  >
                    {MEMBER_TYPE_LABELS[type]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {error ? (
          <Text style={{ color: "#b91c1c", fontSize: 14 }}>{error}</Text>
        ) : null}

        <Pressable
          onPress={() => void handleCreate()}
          disabled={!isValid || createHousehold.isPending}
          style={{
            backgroundColor: semanticColors.primary,
            borderRadius: 10,
            paddingVertical: 14,
            alignItems: "center",
            opacity: !isValid || createHousehold.isPending ? 0.6 : 1,
          }}
        >
          {createHousehold.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 16 }}>
              Crear hogar
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.push("/(auth)/join")}
          style={{ alignItems: "center", paddingVertical: 4 }}
        >
          <Text style={{ color: semanticColors.primary, fontSize: 14, fontWeight: "600" }}>
            ¿Tenés un código de invitación? Unirte a un hogar
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
