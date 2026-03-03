import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, KeyRound, Users } from "lucide-react-native";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useJoinHousehold } from "@/hooks/use-households";
import { StyledTextInput } from "@/components/ui/text-input";
import { Button } from "@/components/ui/button";
import { colors, fontFamily, radius, spacing, typography } from "@/theme";

export default function JoinHouseholdScreen() {
  const { hydrate } = useMobileAuth();
  const joinHousehold = useJoinHousehold();

  // Pre-fill code when arriving from a deep link (habita://join?code=XXXX)
  const params = useLocalSearchParams<{ code?: string }>();
  const [inviteCode, setInviteCode] = useState(params.code?.toUpperCase() ?? "");
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
        </Pressable>
        <View style={styles.headerLogoRow}>
          <Image source={require("../../assets/logo.png")} style={styles.headerLogoImg} />
          <Text style={styles.headerBrand}>Habita</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Users size={24} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Unite a un hogar</Text>
          <Text style={styles.heroSubtitle}>
            Ingresá el código que te compartió tu familia o compañeros de hogar.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <StyledTextInput
            label="Código de invitación"
            placeholder="Ej: ABCD1234"
            value={inviteCode}
            onChangeText={(text) => setInviteCode(text.toUpperCase())}
            autoCapitalize="characters"
            leftIcon={<KeyRound size={18} color={colors.mutedForeground} />}
            maxLength={20}
          />

          <View style={styles.fieldGap}>
            <StyledTextInput
              label="Tu nombre"
              placeholder="Ej: Franco"
              value={memberName}
              onChangeText={setMemberName}
              maxLength={50}
            />
          </View>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>¿Cómo funciona?</Text>
          <View style={styles.infoList}>
            {[
              { step: "1", text: "Pedí el código de invitación al administrador del hogar" },
              { step: "2", text: "Ingresalo arriba junto con tu nombre" },
              { step: "3", text: "¡Listo! Ya podés colaborar con las tareas del hogar" },
            ].map((item) => (
              <View key={item.step} style={styles.infoItem}>
                <View style={styles.infoStepBadge}>
                  <Text style={styles.infoStepText}>{item.step}</Text>
                </View>
                <Text style={styles.infoItemText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Submit */}
        <Button
          onPress={() => void handleJoin()}
          disabled={!isValid || joinHousehold.isPending}
          loading={joinHousehold.isPending}
          style={styles.submitBtn}
        >
          {joinHousehold.isPending ? "Uniéndote..." : "Unirme al hogar"}
        </Button>

        {/* Back link */}
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <ArrowLeft size={14} color={colors.primary} />
          <Text style={styles.backLinkText}>Volver a crear un hogar</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerLogoImg: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  headerBrand: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 60,
  },
  heroSection: {
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: {
    ...typography.displayMd,
    textAlign: "center",
  },
  heroSubtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  formSection: {
    marginBottom: spacing.xl,
  },
  fieldGap: {
    marginTop: spacing.lg,
  },
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontFamily: fontFamily.sans,
    color: colors.errorText,
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  infoTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 12,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoStepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  infoStepText: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  infoItemText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  submitBtn: {
    marginBottom: spacing.md,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.md,
  },
  backLinkText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
});
