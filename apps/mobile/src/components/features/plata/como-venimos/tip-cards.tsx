import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { radii as radius } from "@habita/design-tokens";
import { tipTone } from "@/lib/plata-como-venimos-logic";
import { toInAppHref } from "@/lib/navigation";

import type { SpendingTip } from "@habita/contracts";

/** Tips as cards — Ladrillo soft to act, Hoja/monte soft when positive (§5.3). No emojis (§10). */
export function TipCards({ tips }: { tips: SpendingTip[] }): React.JSX.Element | null {
  const colors = useThemeColors();

  if (tips.length === 0) return null;

  return (
    <View style={styles.list}>
      {tips.map((tip) => {
        const tone = tipTone(tip.severity);
        const bg = tone === "act" ? colors.ladrilloSoft : colors.monteSoft;
        const text = tone === "act" ? colors.ladrilloText : colors.monte;
        return (
          <View key={tip.id} style={[styles.card, { backgroundColor: bg }]}>
            <Text style={[styles.message, { color: text }]}>{tip.message}</Text>
            {tip.action && <TipAction action={tip.action} textColor={text} />}
          </View>
        );
      })}
    </View>
  );
}

interface TipActionProps {
  action: NonNullable<SpendingTip["action"]>;
  textColor: string;
}

function TipAction({ action, textColor }: TipActionProps): React.JSX.Element {
  return (
    <Pressable
      onPress={() => {
        const href = toInAppHref(action.href);
        if (href) router.push(href);
      }}
    >
      <Text style={[styles.action, { color: textColor }]}>{action.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  card: { borderRadius: radius.cardSm, padding: spacing.md, gap: 4 },
  message: { fontFamily: fontFamilyForWeight(400), fontSize: 14 },
  action: { fontFamily: fontFamilyForWeight(600), fontSize: 13, textDecorationLine: "underline" },
});
