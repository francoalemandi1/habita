import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { radii as radius } from "@habita/design-tokens";
import { buildDebtCallout } from "@/lib/plata-expense-detail-logic";
import { CATEGORY_LABELS, resolveExpenseIcon } from "@/lib/plata-categories";
import { DeleteExpenseButton } from "./delete-expense-button";

import type { LucideIcon } from "lucide-react-native";
import type { ThemeColors } from "@/theme";
import type { ExpenseDetail } from "@/hooks/use-expense-feed";
import type { MemberType } from "@habita/contracts";

function CategoryGlyph({ icon: Icon, color }: { icon: LucideIcon; color: string }): React.JSX.Element {
  return <Icon size={24} strokeWidth={1.75} color={color} />;
}

interface ExpenseDetailViewProps {
  expense: ExpenseDetail;
  currentMemberId: string;
  currentMemberType: MemberType;
}

function formatArs(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-AR")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

/** Expense detail (level 1), handoff §5.3 "Plata" — "Detalle de gasto". */
export function ExpenseDetailView({ expense, currentMemberId, currentMemberType }: ExpenseDetailViewProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const canEdit = currentMemberType === "ADULT" || expense.paidBy.id === currentMemberId;

  const callout = buildDebtCallout({
    currentMemberId,
    paidById: expense.paidBy.id,
    paidByName: expense.paidBy.name,
    splits: expense.splits.map((split) => ({
      memberId: split.memberId,
      memberName: split.member.name,
      amount: split.amount,
    })),
  });

  const otherSplit = expense.splits.find((split) => split.memberId !== expense.paidBy.id);

  return (
    <View style={styles.container}>
      <View style={styles.heroBlock}>
        <View style={styles.iconBox}>
          <CategoryGlyph icon={resolveExpenseIcon(expense.category, expense.subcategory)} color={colors.ink} />
        </View>
        <Text style={styles.amount}>{formatArs(expense.amount)}</Text>
        <View>
          <Text style={styles.title}>{expense.title}</Text>
          <Text style={styles.meta}>
            {formatDate(expense.date)} · {CATEGORY_LABELS[expense.category]}
          </Text>
        </View>
      </View>

      <View style={styles.splits}>
        {expense.splits.map((split) => (
          <View key={split.id} style={styles.splitRow}>
            <Text style={styles.splitName}>{split.member.name}</Text>
            <Text style={styles.splitAmount}>{formatArs(split.amount)}</Text>
          </View>
        ))}
      </View>

      {callout ? (
        <View
          style={[
            styles.callout,
            { backgroundColor: callout.tone === "monte-soft" ? colors.monteSoft : colors.ladrilloSoft },
          ]}
        >
          <Text
            style={[styles.calloutText, { color: callout.tone === "monte-soft" ? colors.monte : colors.ladrilloText }]}
          >
            {callout.text}
          </Text>
        </View>
      ) : null}

      {canEdit ? (
        <DeleteExpenseButton
          expenseId={expense.id}
          hasLaterSettlement={expense.hasLaterSettlement}
          otherMemberName={otherSplit?.member.name ?? "la otra persona"}
        />
      ) : null}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.xl,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: 32,
    },
    heroBlock: {
      gap: spacing.sm,
      alignItems: "flex-start",
    },
    iconBox: {
      width: 52,
      height: 52,
      borderRadius: radius.tile,
      backgroundColor: c.paper,
      alignItems: "center",
      justifyContent: "center",
    },
    amount: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 48,
      letterSpacing: -1.2,
      color: c.ink,
    },
    title: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 17,
      color: c.ink,
    },
    meta: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
    splits: {
      gap: spacing.sm,
    },
    splitRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    splitName: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink,
    },
    splitAmount: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 15,
      color: c.ink,
    },
    callout: {
      borderRadius: radius.tile,
      paddingHorizontal: 14,
      paddingVertical: spacing.md,
    },
    calloutText: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 14,
    },
  });
}
