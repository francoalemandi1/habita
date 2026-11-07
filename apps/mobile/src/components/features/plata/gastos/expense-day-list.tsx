import { useMemo, useSyncExternalStore } from "react";
import { ActivityIndicator, SectionList, StyleSheet, Text, View } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { router } from "expo-router";
import { ListRow } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { getDeferredDeleteVersion, isPendingDelete, subscribeDeferredDeletes } from "@/lib/deferred-delete";
import { groupExpensesByDay, payerMetaText } from "@/lib/plata-gastos-logic";
import { resolveExpenseIcon } from "@/lib/plata-categories";

import type { ReactNode } from "react";
import type { ThemeColors } from "@/theme";
import type { SerializedExpense } from "@habita/contracts";

interface ExpenseDayListProps {
  expenses: SerializedExpense[];
  currentMemberId: string;
  header: ReactNode;
  footer: ReactNode;
  hasMore: boolean;
  isFetchingMore: boolean;
  onEndReached: () => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

/**
 * Day-grouped expense rows ("Hoy" / "Ayer" / "Lunes 2 nov"). Rows with a
 * pending deferred delete are hidden. Deleting lives on the detail screen,
 * which knows the role rule and `hasLaterSettlement` (pattern A vs D).
 */
export function ExpenseDayList({
  expenses,
  currentMemberId,
  header,
  footer,
  hasMore,
  isFetchingMore,
  onEndReached,
  onScroll,
}: ExpenseDayListProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const pendingVersion = useSyncExternalStore(subscribeDeferredDeletes, getDeferredDeleteVersion);
  const visible = useMemo(
    () => expenses.filter((expense) => !isPendingDelete(expense.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses, pendingVersion],
  );
  const sections = useMemo(
    () => groupExpensesByDay(visible, new Date()).map((group) => ({ ...group, data: group.items })),
    [visible],
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<>{header}</>}
      ListFooterComponent={
        <>
          {hasMore && isFetchingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator color={colors.monte} />
            </View>
          ) : null}
          {footer}
        </>
      }
      onEndReached={() => {
        if (hasMore && !isFetchingMore) onEndReached();
      }}
      onEndReachedThreshold={0.4}
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      renderSectionHeader={({ section }) => <Text style={styles.dayLabel}>{section.label}</Text>}
      renderItem={({ item }) => (
        <ListRow
          icon={resolveExpenseIcon(item.category, item.subcategory)}
          title={item.title}
          meta={payerMetaText({
            paidByName: item.paidBy.name,
            isCurrentUserPayer: item.paidBy.id === currentMemberId,
            splitCount: item.splits.length,
          })}
          trailingAmount={formatArs(item.amount)}
          onPress={() => router.push(`/(app)/plata/gastos/${item.id}`)}
        />
      )}
    />
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 24,
    },
    dayLabel: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 11,
      letterSpacing: 0.9,
      textTransform: "uppercase",
      color: c.ink3,
      paddingTop: spacing.md,
      paddingBottom: 4,
      backgroundColor: c.paper,
    },
    loadingMore: {
      paddingVertical: spacing.lg,
      alignItems: "center",
    },
  });
}
