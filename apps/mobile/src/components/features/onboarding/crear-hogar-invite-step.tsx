import { useMemo, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Copy } from "lucide-react-native";
import { Button } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, radius, spacing, typography } from "@/theme";
import { mobileConfig } from "@/lib/config";

import type { ThemeColors } from "@/theme";

interface CrearHogarInviteStepProps {
  inviteCode: string;
  householdName: string;
}

/** Crear hogar — step 2 (Invitar, skippable), per handoff §5.3. */
export function CrearHogarInviteStep({ inviteCode, householdName }: CrearHogarInviteStepProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${mobileConfig.oauthBaseUrl}/join/${inviteCode}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Unite a mi hogar "${householdName}" en Habita: ${inviteUrl}`,
      });
    } catch (error) {
      console.warn("CrearHogarInviteStep: share failed", error);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.title}>Invitá a tu casa</Text>

      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Código de invitación</Text>
        <Text style={styles.codeValue}>{inviteCode}</Text>
        <Pressable onPress={() => void handleCopy()} style={styles.copyRow}>
          <Copy size={14} color={colors.monte} />
          <Text style={styles.copyText}>{copied ? "Copiado" : "Copiar código"}</Text>
        </Pressable>
      </View>

      <Button label="Invitar a mi hogar" variant="secondary" onPress={() => void handleShare()} />
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    form: { gap: spacing.xl },
    title: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: typography.pageTitle.fontSize,
      color: c.ink,
    },
    codeCard: {
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
    },
    codeLabel: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 12,
      color: c.ink2,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
    },
    codeValue: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 32,
      color: c.ink,
      letterSpacing: 4,
      marginBottom: spacing.md,
    },
    copyRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    copyText: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 13,
      color: c.monte,
    },
  });
}
