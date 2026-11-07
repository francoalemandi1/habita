import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, ListRow } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import type { ThemeColors } from "@/theme";
import { useSettlementHistory } from "@/hooks/use-money";
import { formatCurrencyArs, isMigratedSettlement, settlementRowLabel } from "@/lib/plata-money-saldos";
import { sectionLabelStyle } from "@/lib/plata-money-ui";

interface SettlementHistoryProps {
  currentMemberId: string;
}

/** "Historial" — settlement rows newest first, with a "Ver más" to load the next page. */
export function SettlementHistory({ currentMemberId }: SettlementHistoryProps): React.JSX.Element | null {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useSettlementHistory();

  const settlements = useMemo(() => data?.pages.flatMap((page) => page.settlements) ?? [], [data]);

  if (isLoading) return null;
  if (settlements.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Historial</Text>
      <View>
        {settlements.map((settlement) => {
          const migrated = isMigratedSettlement(settlement.note);
          const dateLabel = new Date(settlement.settledAt).toLocaleDateString("es-AR", {
            day: "numeric",
            month: "short",
          });
          return (
            <ListRow
              key={settlement.id}
              title={settlementRowLabel(settlement, currentMemberId)}
              meta={migrated ? `${dateLabel} · ${settlement.note}` : dateLabel}
              trailingAmount={`${formatCurrencyArs(settlement.amount)}${
                settlement.currency !== "ARS" ? ` ${settlement.currency}` : ""
              }`}
            />
          );
        })}
      </View>
      {hasNextPage && (
        <Button
          variant="secondary"
          size="sm"
          label="Ver más"
          loadingLabel="Cargando"
          loading={isFetchingNextPage}
          onPress={() => fetchNextPage()}
        />
      )}
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
