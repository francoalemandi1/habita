import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, ProgressBar } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";
import { radii as radius } from "@habita/design-tokens";
import { formatCurrencyArs } from "@/lib/plata-money-saldos";
import { monthLabelEs, quotaStatusLabel } from "@/lib/plata-money-fondo";

import type { FundState, MemberContributionStatus } from "@habita/contracts";

interface FondoHeroProps {
  fund: FundState;
  currentMemberStatus: MemberContributionStatus | undefined;
  onContribute: () => void;
}

/** Monte hero card + Manteca progress of this period's contributions vs total quotas. */
export function FondoHero({ fund, currentMemberStatus, onContribute }: FondoHeroProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const totalQuotas = fund.memberStatuses.reduce((sum, status) => sum + status.allocation, 0);
  const status = quotaStatusLabel(currentMemberStatus);
  const monthLabel = monthLabelEs(fund.currentPeriod);

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Fondo de la casa</Text>
      <Text style={styles.amount}>{formatCurrencyArs(fund.balance)}</Text>

      {totalQuotas > 0 && (
        <View style={styles.progress}>
          <ProgressBar
            progress={fund.contributedThisPeriod / totalQuotas}
            accessibilityLabel={`${formatCurrencyArs(fund.contributedThisPeriod)} de ${formatCurrencyArs(totalQuotas)} aportados`}
          />
          <Text style={styles.progressLabel}>
            {formatCurrencyArs(fund.contributedThisPeriod)} de {formatCurrencyArs(totalQuotas)} aportados
          </Text>
        </View>
      )}

      <View style={styles.quotaRow}>
        <Text style={styles.quotaText}>
          Tu cuota de {monthLabel} · {status}
        </Text>
        <Button label="Aportar" variant="secondary" size="sm" onPress={onContribute} />
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.monte,
      borderRadius: radius.card,
      padding: spacing.lg,
      gap: spacing.lg,
    },
    cardLabel: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.paper,
      opacity: 0.8,
    },
    amount: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 56,
      lineHeight: 56 * 0.95,
      letterSpacing: -56 * 0.04,
      fontVariant: ["tabular-nums"],
      color: c.paper,
      marginTop: 2,
    },
    progress: {
      gap: 6,
    },
    progressLabel: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.paper,
      opacity: 0.8,
    },
    quotaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    quotaText: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.paper,
      flex: 1,
    },
  });
}
