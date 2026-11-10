import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ListRow } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import type { ThemeColors } from "@/theme";
import { formatCurrencyArs } from "@/lib/plata-money-saldos";
import { sectionLabelStyle } from "@/lib/plata-money-ui";

import type { MemberContributionStatus } from "@habita/contracts";

interface FondoQuotasListProps {
  memberStatuses: MemberContributionStatus[];
}

/** Cuotas por persona — paid vs pending this period. */
export function FondoQuotasList({ memberStatuses }: FondoQuotasListProps): React.JSX.Element | null {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (memberStatuses.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Cuotas del mes</Text>
      <View>
        {memberStatuses.map((status) => (
          <ListRow
            key={status.memberId}
            title={status.memberName}
            trailingAmount={
              status.pending > 0 ? `Falta ${formatCurrencyArs(status.pending)}` : `Aportó ${formatCurrencyArs(status.contributed)}`
            }
          />
        ))}
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 8,
    },
    label: sectionLabelStyle(c),
  });
}
