import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useJoinHousehold } from "@/hooks/use-households";
import { useThemeColors } from "@/hooks/use-theme";
import { Button, TextField } from "@/components/ds";
import { fontFamilyForWeight, spacing, typography } from "@/theme";
import { HabitaLogo } from "@/components/ds";

/** Unirse — invite code entry, per handoff §5.3. */
export default function JoinHouseholdScreen() {
  const colors = useThemeColors();
  const { hydrate } = useMobileAuth();
  const joinHousehold = useJoinHousehold();

  const params = useLocalSearchParams<{ code?: string }>();
  const [inviteCode, setInviteCode] = useState(params.code?.toUpperCase() ?? "");
  const [error, setError] = useState<string | null>(null);

  const isValid = inviteCode.trim().length > 0;

  const handleJoin = async () => {
    setError(null);
    try {
      await joinHousehold.mutateAsync({ inviteCode: inviteCode.trim().toUpperCase() });
      await hydrate();
      router.replace("/(app)/casa");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo unir al hogar.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft size={20} color={colors.ink} strokeWidth={1.75} />
        </Pressable>
        <HabitaLogo size={24} />
        <View style={styles.backBtn} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: colors.ink }]}>Unirse a un hogar</Text>

        <TextField
          label="Código de invitación"
          placeholder="CODIGO"
          value={inviteCode}
          onChangeText={(text) => setInviteCode(text.toUpperCase().slice(0, 8))}
          autoCapitalize="characters"
          maxLength={8}
          error={error ?? undefined}
        />

        <Button
          label="Unirme"
          loadingLabel="Uniéndote"
          loading={joinHousehold.isPending}
          disabled={!isValid}
          onPress={() => void handleJoin()}
          style={styles.submitBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xl },
  title: {
    fontFamily: fontFamilyForWeight(700),
    fontSize: typography.pageTitle.fontSize,
  },
  submitBtn: { marginTop: spacing.md },
});
