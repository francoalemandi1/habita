import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ds";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useMembers } from "@/hooks/use-members";
import { useExpenseDetail } from "@/hooks/use-expense-feed";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { ExpenseDetailView } from "@/components/features/plata/expense-detail/expense-detail-view";

import type { ThemeColors } from "@/theme";

/** Expense detail (level 1), handoff §5.3 "Plata" — "Detalle de gasto". */
export default function ExpenseDetailScreen(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();

  const { me, activeHouseholdId } = useMobileAuth();
  const membersQuery = useMembers();
  const members = useMemo(() => membersQuery.data?.members ?? [], [membersQuery.data]);
  const myMember = useMemo(
    () => me?.members.find((member) => member.householdId === activeHouseholdId) ?? null,
    [me, activeHouseholdId],
  );
  const currentMemberId = myMember?.id ?? "";
  const currentMemberType = members.find((member) => member.id === currentMemberId)?.memberType ?? "ADULT";

  const detailQuery = useExpenseDetail(id);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader variant="detail" title="Gasto" backLabel="Plata" onBack={() => router.back()} />
      {detailQuery.isLoading ? (
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Cargando…</Text>
        </View>
      ) : !detailQuery.data ? (
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>No encontramos este gasto</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <ExpenseDetailView
            expense={detailQuery.data}
            currentMemberId={currentMemberId}
            currentMemberType={currentMemberType}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.paper,
    },
    notFound: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
    },
    notFoundText: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 15,
      color: c.ink2,
    },
  });
}
