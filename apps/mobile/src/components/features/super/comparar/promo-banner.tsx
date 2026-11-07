import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, ChevronDown, ChevronUp, CreditCard } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { radii as radius } from "@habita/design-tokens";
import {
  formatDaysShort,
  getBestPromosByBank,
  getTodayDayName,
  isPromoExpired,
  scorePromo,
} from "@/lib/super-promo-logic";

import type { ThemeColors } from "@/theme";
import type { BankPromo } from "@habita/contracts";

interface PromoBannerProps {
  promos: BankPromo[];
  selectedPromoId: string | null;
  onSelectPromo: (promoId: string | null) => void;
}

/** Collapsible bank promo banner for a store card (design handoff §5.3). */
export function PromoBanner({ promos, selectedPromoId, onSelectPromo }: PromoBannerProps): React.JSX.Element | null {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);

  if (promos.length === 0) return null;

  const todayName = getTodayDayName();
  const bestPerBank = getBestPromosByBank(promos, todayName);
  const best = bestPerBank[0];
  if (!best) return null;
  const extraCount = promos.length - bestPerBank.length;

  const allSorted = promos.filter((p) => !isPromoExpired(p)).sort((a, b) => scorePromo(b, todayName) - scorePromo(a, todayName));
  const visiblePromos = expanded ? allSorted : bestPerBank;

  const selectedPromo = selectedPromoId ? promos.find((p) => p.id === selectedPromoId) : null;

  const summaryText = selectedPromo
    ? `${selectedPromo.discountPercent}% ${selectedPromo.bankDisplayName}`
    : bestPerBank.length === 1
      ? `${best.discountPercent}% ${best.bankDisplayName} · ${formatDaysShort(best.daysOfWeek)}`
      : `Hasta ${best.discountPercent}% dto · ${bestPerBank.length} bancos`;

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={[styles.toggle, selectedPromo && styles.toggleActive]}>
        <CreditCard size={13} strokeWidth={1.75} color={selectedPromo ? colors.monte : colors.ink2} />
        <Text style={[styles.toggleText, selectedPromo && styles.toggleTextActive]} numberOfLines={1}>
          {summaryText}
        </Text>
        {expanded ? (
          <ChevronUp size={13} strokeWidth={1.75} color={selectedPromo ? colors.monte : colors.ink2} />
        ) : (
          <ChevronDown size={13} strokeWidth={1.75} color={selectedPromo ? colors.monte : colors.ink2} />
        )}
      </Pressable>

      {expanded ? (
        <View style={styles.list}>
          {visiblePromos.map((promo) => {
            const isSelected = promo.id === selectedPromoId;
            return (
              <Pressable
                key={promo.id}
                onPress={() => onSelectPromo(isSelected ? null : promo.id)}
                style={[styles.item, isSelected && styles.itemSelected]}
              >
                <View style={[styles.badge, isSelected && styles.badgeSelected]}>
                  <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>{promo.discountPercent}%</Text>
                </View>
                <Text style={styles.itemBank} numberOfLines={1}>
                  {promo.bankDisplayName} · {formatDaysShort(promo.daysOfWeek)}
                </Text>
                {isSelected ? <Check size={14} strokeWidth={1.75} color={colors.monte} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {!expanded && extraCount > 0 ? (
        <Pressable onPress={() => setExpanded(true)} style={styles.extraHint}>
          <Text style={styles.extraHintText}>+{extraCount} promo{extraCount !== 1 ? "s" : ""} más de estos bancos</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { gap: spacing.xs },
    toggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      borderRadius: radius.control,
      backgroundColor: c.sand,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    toggleActive: { backgroundColor: c.monteSoft },
    toggleText: { flex: 1, fontFamily: fontFamilyForWeight(500), fontSize: 13, color: c.ink2 },
    toggleTextActive: { color: c.monte },
    list: { gap: spacing.xs, backgroundColor: c.sand, borderRadius: radius.control, padding: spacing.sm },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      borderRadius: radius.control,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    itemSelected: { backgroundColor: c.monteSoft },
    badge: { borderRadius: 6, backgroundColor: c.mantecaSoft, paddingHorizontal: 6, paddingVertical: 2 },
    badgeSelected: { backgroundColor: c.monte },
    badgeText: { fontFamily: fontFamilyForWeight(700), fontSize: 11, color: c.mantecaText },
    badgeTextSelected: { color: c.paper },
    itemBank: { flex: 1, fontFamily: fontFamilyForWeight(500), fontSize: 13, color: c.ink },
    extraHint: { paddingHorizontal: spacing.xs, paddingTop: 2 },
    extraHintText: { fontFamily: fontFamilyForWeight(500), fontSize: 12, color: c.monte },
  });
}
