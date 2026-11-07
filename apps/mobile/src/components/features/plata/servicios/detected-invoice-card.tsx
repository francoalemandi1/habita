import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { radii as radius } from "@habita/design-tokens";
import { CATEGORY_ICONS } from "@/lib/plata-categories";
import { toExpenseCategory } from "@/lib/plata-expense-category";
import { openAnotar } from "@/lib/anotar-store";
import { dismissDetectedService } from "@/lib/plata-detected-dismiss-store";
import { detectedServiceKey } from "@/lib/plata-servicios-logic";

import type { ThemeColors } from "@/theme";

interface DetectedInvoiceCardProps {
  service: {
    title: string;
    provider: string;
    category: string;
    lastAmount: number | null;
    currency: string;
    senderEmail: string;
  };
  onDismiss: (key: string) => void;
}

function formatAmount(amount: number, currency: string): string {
  const prefix = currency === "USD" ? "US$" : "$";
  return `${prefix}${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

/** Manteca soft card for a Gmail-detected invoice (§5.3 "Servicios", §7 pattern B). */
export function DetectedInvoiceCard({ service, onDismiss }: DetectedInvoiceCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isDismissing, setIsDismissing] = useState(false);
  const category = toExpenseCategory(service.category, "OTHER");
  const Icon = CATEGORY_ICONS[category];
  const key = detectedServiceKey(service);

  function handleAdd(): void {
    openAnotar({
      kind: "expense",
      expense: {
        title: service.title,
        amount: service.lastAmount ?? undefined,
        category,
      },
    });
  }

  async function handleDismiss(): Promise<void> {
    setIsDismissing(true);
    await dismissDetectedService(key);
    onDismiss(key);
  }

  return (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Icon size={18} strokeWidth={1.75} color={colors.mantecaText} />
      </View>
      <View style={styles.textColumn}>
        <Text style={styles.title} numberOfLines={1}>{service.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {service.lastAmount != null ? formatAmount(service.lastAmount, service.currency) : service.provider}
        </Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => void handleDismiss()} disabled={isDismissing} hitSlop={8}>
        <Text style={styles.dismiss}>No es mía</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={handleAdd} hitSlop={8}>
        <Text style={styles.add}>Agregar</Text>
      </Pressable>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: c.mantecaSoft,
      borderRadius: radius.card,
      padding: spacing.md,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: radius.rowIcon,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    textColumn: { flex: 1, gap: 2 },
    title: { fontFamily: fontFamilyForWeight(500), fontSize: 15, color: c.ink },
    subtitle: { fontFamily: fontFamilyForWeight(400), fontSize: 13, color: c.mantecaText },
    dismiss: { fontFamily: fontFamilyForWeight(500), fontSize: 13, color: c.ink2 },
    add: { fontFamily: fontFamilyForWeight(600), fontSize: 14, color: c.monte },
  });
}
