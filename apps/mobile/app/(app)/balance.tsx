import { useEffect, useMemo, useState, useCallback } from "react";
import { router } from "expo-router";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  HandCoins,
  Info,
  Landmark,
  Minus,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  UserPlus,
  X,
  Zap,
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  // Category icons
  ShoppingCart,
  Home,
  UtensilsCrossed,
  Car,
  HeartPulse,
  Clapperboard,
  GraduationCap,
  Wrench,
  MoreHorizontal,
  // Subcategory icons
  Bike,
  Store,
} from "lucide-react-native";
import { useDeleteExpense, useExpenses, useUpdateExpense } from "@/hooks/use-expenses";
import { useExpenseInsights } from "@/hooks/use-expense-insights";
import { useExpenseBalances, useSettleDebts } from "@/hooks/use-expense-balances";
import { useFund, useContributeToFund, useSetupFund } from "@/hooks/use-fund";
import { useMembers } from "@/hooks/use-members";
import { useHouseholdDetail } from "@/hooks/use-households";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { mobileConfig } from "@/lib/config";
import { useThemeColors } from "@/hooks/use-theme";

import type { ExpenseInsightsResponse } from "@habita/contracts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TabBar } from "@/components/ui/tab-bar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { StyledTextInput } from "@/components/ui/text-input";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { ScreenHeader } from "@/components/features/screen-header";
import { categoryColors, categoryColorFallback, fontFamily, radius, spacing } from "@/theme";
import { useFirstVisit } from "@/hooks/use-first-visit";
import { SectionGuideCard } from "@/components/features/section-guide-card";

import type { ThemeColors } from "@/theme";
import type { SerializedExpense } from "@habita/contracts";
import type { LucideIcon } from "lucide-react-native";

// ─── Category system ─────────────────────────────────────────────────────────

type ExpenseCategory =
  | "GROCERIES" | "UTILITIES" | "RENT" | "FOOD" | "TRANSPORT"
  | "HEALTH" | "ENTERTAINMENT" | "EDUCATION" | "HOME" | "OTHER";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  GROCERIES: "Supermercado",
  UTILITIES: "Servicios",
  RENT: "Alquiler",
  FOOD: "Comida",
  TRANSPORT: "Transporte",
  HEALTH: "Salud",
  ENTERTAINMENT: "Entretenimiento",
  EDUCATION: "Educación",
  HOME: "Hogar",
  OTHER: "Otros",
};

const CATEGORY_ICONS: Record<ExpenseCategory, LucideIcon> = {
  GROCERIES: ShoppingCart,
  UTILITIES: Zap,
  RENT: Home,
  FOOD: UtensilsCrossed,
  TRANSPORT: Car,
  HEALTH: HeartPulse,
  ENTERTAINMENT: Clapperboard,
  EDUCATION: GraduationCap,
  HOME: Wrench,
  OTHER: MoreHorizontal,
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  GENERAL: "General",
  SUPERMARKET: "Supermercado",
  KIOSCO: "Kiosco",
  DELIVERY: "Delivery",
  RESTAURANT: "Restaurante",
  STREAMING: "Streaming",
  PHARMACY: "Farmacia",
  FUEL: "Combustible",
  TRANSPORT_APP: "Viaje app",
};

const SUBCATEGORY_ICON_OVERRIDES: Record<string, LucideIcon> = {
  DELIVERY: Bike,
  KIOSCO: Store,
  SUPERMARKET: ShoppingCart,
};

function getCategoryColor(category?: string | null): { bg: string; text: string } {
  const key = (category ?? "").toUpperCase();
  const match = categoryColors[key];
  if (match) return { bg: match.bg, text: match.text };
  return { bg: categoryColorFallback.bg, text: categoryColorFallback.text };
}

// ─── Format helpers ──────────────────────────────────────────────────────────

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
  }
  if (amount >= 10_000) {
    return `$${Math.round(amount / 1_000).toLocaleString("es-AR")}k`;
  }
  return `$${amount.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatAmountFull(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

/** Date group label: "Hoy", "Ayer", or formatted date. */
function getDateGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const expenseDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (expenseDay.getTime() === today.getTime()) return "Hoy";
  if (expenseDay.getTime() === yesterday.getTime()) return "Ayer";

  return date.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

/** Group expenses by date, preserving order. */
function groupByDate(expenses: SerializedExpense[]): Array<{ label: string; items: SerializedExpense[] }> {
  const groups: Array<{ label: string; items: SerializedExpense[] }> = [];
  let currentLabel = "";

  for (const expense of expenses) {
    const label = getDateGroupLabel(expense.date);
    if (label !== currentLabel) {
      groups.push({ label, items: [expense] });
      currentLabel = label;
    } else {
      const last = groups[groups.length - 1];
      if (last) last.items.push(expense);
    }
  }

  return groups;
}

/** Check if an expense is fully settled. */
function isExpenseSettled(expense: SerializedExpense): boolean {
  const otherSplits = expense.splits.filter((s) => s.memberId !== expense.paidBy.id);
  if (otherSplits.length === 0) return true;
  return otherSplits.every((s) => s.settled);
}

// ─── Tab config ──────────────────────────────────────────────────────────────

type Tab = "gastos" | "fondo" | "saldos";

const ALL_TAB_ITEMS: Array<{ key: string; label: string }> = [
  { key: "gastos", label: "Gastos" },
  { key: "fondo", label: "Fondo" },
  { key: "saldos", label: "Saldos" },
];

// ─── FinancialPulse (matches web ContextualHero) ─────────────────────────────

type HeroState = "no_data_ever" | "no_this_month" | "few_expenses" | "no_history" | "full";
type MonthStatus = "stable" | "above_average" | "well_below";

interface InsightsData {
  thisMonthTotal: number;
  projectedTotal: number;
  monthStatus: MonthStatus;
  variableVsAverageTrend: "up" | "down" | "flat";
  variableVsAveragePercent: number;
  variableMonthlyAverage?: number | null;
  hasAnyHistoricalExpenses?: boolean;
  thisMonthExpenseCount?: number;
  hasReliableMonthlyTrend?: boolean;
  upcomingServicesCount: number;
  upcomingServicesCost: number;
  spendingTips?: Array<{ id: string; emoji: string; message: string; severity: string }>;
  frequentExpenses?: Array<{ title: string; amount: number; category: string }>;
}

function resolveHeroState(data: InsightsData): HeroState {
  if (data.hasAnyHistoricalExpenses === false) return "no_data_ever";
  if ((data.thisMonthExpenseCount ?? 0) === 0) return "no_this_month";
  if (data.hasReliableMonthlyTrend === false) return "few_expenses";
  if (data.variableMonthlyAverage === null || data.variableMonthlyAverage === undefined) return "no_history";
  return "full";
}

const STATUS_HEADLINES: Record<MonthStatus, string> = {
  stable: "Dentro de tu promedio",
  well_below: "Vas muy bien este mes",
  above_average: "Estás gastando más de lo habitual",
};

function getStatusConfig(status: MonthStatus, c: ThemeColors): { iconColor: string; bg: string; headline: string } {
  if (status === "above_average") {
    return { iconColor: c.warningText, bg: c.warningBg, headline: STATUS_HEADLINES[status] };
  }
  return { iconColor: c.successText, bg: c.successBg, headline: STATUS_HEADLINES[status] };
}

function TrendBadge({ trend, percent }: { trend: "up" | "down" | "flat"; percent: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (trend === "flat") {
    return (
      <View style={styles.trendBadge}>
        <Minus size={12} color={colors.mutedForeground} />
        <Text style={styles.trendTextFlat}>similar a tu promedio</Text>
      </View>
    );
  }
  const isUp = trend === "up";
  const trendColor = isUp ? colors.errorText : colors.successText;
  return (
    <View style={styles.trendBadge}>
      {isUp ? <TrendingUp size={12} color={trendColor} /> : <TrendingDown size={12} color={trendColor} />}
      <Text style={[styles.trendTextDirectional, { color: trendColor }]}>
        {isUp ? "+" : "-"}{percent}% vs tu promedio
      </Text>
    </View>
  );
}

function FinancialPulseCard({ data }: { data: InsightsData }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const heroState = resolveHeroState(data);

  if (heroState === "no_data_ever") {
    return (
      <View style={[styles.heroCard, { backgroundColor: `${colors.muted}66` }]}>
        <Receipt size={32} color={colors.mutedForeground} style={{ alignSelf: "center" }} />
        <Text style={styles.heroEmptyTitle}>Registrá tu primer gasto para ver cómo venís</Text>
        <Text style={styles.heroEmptySubtitle}>
          Analizamos tus gastos y te ayudamos a entender tu economía
        </Text>
      </View>
    );
  }

  if (heroState === "no_this_month") {
    return (
      <View style={[styles.heroCard, { backgroundColor: colors.warningBg, borderColor: `${colors.warningText}40`, borderWidth: 1 }]}>
        <View style={styles.heroAlertRow}>
          <Info size={16} color={colors.warningText} style={{ marginTop: 2, flexShrink: 0 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroAlertTitle, { color: colors.warningText }]}>
              Este mes aún no registraste gastos
            </Text>
            <Text style={[styles.heroAlertSubtitle, { color: colors.warningText }]}>
              No pasa nada: tu historial sigue disponible para comparar tendencias.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (heroState === "few_expenses") {
    return (
      <View style={[styles.heroCard, { backgroundColor: `${colors.muted}66` }]}>
        <Text style={styles.heroLabel}>Cómo venís este mes</Text>
        <View style={styles.heroAmountRow}>
          <Text style={styles.heroAmountLg}>{formatAmount(data.thisMonthTotal)}</Text>
          <Text style={styles.heroAmountSuffix}>gastados</Text>
        </View>
        <Text style={[styles.heroEmptySubtitle, { marginTop: 8 }]}>
          Con más datos podemos mostrarte tendencias y comparativas
        </Text>
      </View>
    );
  }

  // no_history or full
  const config = getStatusConfig(data.monthStatus, colors);

  return (
    <View style={[styles.heroCard, { backgroundColor: config.bg }]}>
      <Text style={styles.heroLabel}>Cómo venís este mes</Text>

      {heroState === "full" && (
        <View style={styles.heroStatusRow}>
          {data.monthStatus === "above_average" ? (
            <AlertTriangle size={20} color={config.iconColor} />
          ) : (
            <Check size={20} color={config.iconColor} />
          )}
          <Text style={styles.heroStatusText}>{config.headline}</Text>
        </View>
      )}

      <View style={styles.heroAmountRow}>
        <Text style={styles.heroAmountLg}>{formatAmount(data.thisMonthTotal)}</Text>
        <Text style={styles.heroAmountSuffix}>gastados</Text>
      </View>

      <Text style={styles.heroProjection}>
        Camino a {formatAmount(data.projectedTotal)}
      </Text>

      {heroState === "full" && data.variableVsAverageTrend !== "flat" && (
        <View style={{ marginTop: 8 }}>
          <TrendBadge trend={data.variableVsAverageTrend} percent={data.variableVsAveragePercent} />
        </View>
      )}
    </View>
  );
}

// ─── QuickAddPills ───────────────────────────────────────────────────────────

interface FrequentExpense {
  title: string;
  amount: number;
  category: string;
}

function QuickAddPills({ expenses, onQuickAdd }: { expenses: FrequentExpense[]; onQuickAdd: (e: FrequentExpense) => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (expenses.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
      <Text style={styles.pillsLabel}>Rápido:</Text>
      {expenses.map((expense) => {
        const IconComp = CATEGORY_ICONS[expense.category as ExpenseCategory] ?? Receipt;
        return (
          <Pressable key={expense.title} onPress={() => onQuickAdd(expense)} style={styles.pill}>
            <IconComp size={12} color={colors.text} />
            <Text style={styles.pillText}>{expense.title} {formatAmount(expense.amount)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── SpendingTips ────────────────────────────────────────────────────────────

function SpendingTips({ tips }: { tips: Array<{ id: string; emoji: string; message: string; severity: string }> }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (tips.length === 0) return null;

  const severityStyles: Record<string, { bg: string; borderColor: string; labelColor: string }> = {
    info: { bg: `${colors.muted}4D`, borderColor: `${colors.border}66`, labelColor: colors.mutedForeground },
    alerta: { bg: colors.warningBg, borderColor: `${colors.warningText}40`, labelColor: colors.warningText },
    critica: { bg: colors.errorBg, borderColor: `${colors.errorText}40`, labelColor: colors.errorText },
  };

  return (
    <View style={{ gap: 8 }}>
      {tips.map((tip) => {
        const style = severityStyles[tip.severity] ?? severityStyles.info;
        const severityLabel = tip.severity === "critica" ? "Critica" : tip.severity === "alerta" ? "Alerta" : "Info";
        return (
          <View
            key={tip.id}
            style={[styles.tipCard, { backgroundColor: style.bg, borderColor: style.borderColor }]}
          >
            <Text style={{ fontSize: 16, lineHeight: 20, flexShrink: 0 }}>{tip.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tipSeverity, { color: style.labelColor }]}>{severityLabel}</Text>
              <Text style={styles.tipMessage}>{tip.message}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── UpcomingServicesNotice ──────────────────────────────────────────────────

function UpcomingServicesNotice({ count, cost }: { count: number; cost: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (count === 0) return null;
  return (
    <View style={styles.servicesNotice}>
      <Zap size={14} color={colors.warningText} style={{ marginTop: 2, flexShrink: 0 }} />
      <Text style={styles.servicesNoticeText}>
        Tenés {count} servicio{count !== 1 ? "s" : ""} que vence{count !== 1 ? "n" : ""} pronto (~{formatAmount(cost)})
      </Text>
    </View>
  );
}

// ─── Subcategory filter pills ────────────────────────────────────────────────

const SUBCATEGORY_PRIORITY = ["DELIVERY", "KIOSCO", "SUPERMARKET"];

function SubcategoryFilters({
  expenses,
  active,
  onChange,
}: {
  expenses: SerializedExpense[];
  active: string;
  onChange: (key: string) => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const options = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of expenses) {
      counts[e.subcategory] = (counts[e.subcategory] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([subcategory, count]) => ({ subcategory, count }))
      .sort((a, b) => {
        const aPri = SUBCATEGORY_PRIORITY.indexOf(a.subcategory);
        const bPri = SUBCATEGORY_PRIORITY.indexOf(b.subcategory);
        const aRank = aPri === -1 ? Number.MAX_SAFE_INTEGER : aPri;
        const bRank = bPri === -1 ? Number.MAX_SAFE_INTEGER : bPri;
        if (aRank !== bRank) return aRank - bRank;
        return b.count - a.count;
      });
  }, [expenses]);

  if (options.length <= 1) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
      <Pressable
        onPress={() => onChange("ALL")}
        style={[styles.filterPill, active === "ALL" && styles.filterPillActive]}
      >
        <Text style={[styles.filterPillText, active === "ALL" && styles.filterPillTextActive]}>
          Todas ({expenses.length})
        </Text>
      </Pressable>
      {options.map((opt) => (
        <Pressable
          key={opt.subcategory}
          onPress={() => onChange(opt.subcategory)}
          style={[styles.filterPill, active === opt.subcategory && styles.filterPillActive]}
        >
          <Text style={[styles.filterPillText, active === opt.subcategory && styles.filterPillTextActive]}>
            {SUBCATEGORY_LABELS[opt.subcategory] ?? opt.subcategory} ({opt.count})
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ─── ExpenseItem (matches web ExpenseItem layout) ────────────────────────────

function ExpenseItem({
  expense,
  currentMemberId,
  settled,
  isSolo,
  onPress,
}: {
  expense: SerializedExpense;
  currentMemberId: string;
  settled: boolean;
  isSolo: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const IconComp = SUBCATEGORY_ICON_OVERRIDES[expense.subcategory] ?? CATEGORY_ICONS[expense.category as ExpenseCategory] ?? Receipt;
  const catStyle = getCategoryColor(expense.category);
  const isPayer = expense.paidBy.id === currentMemberId;
  const mySplit = expense.splits.find((s) => s.memberId === currentMemberId);
  const myAmount = mySplit?.amount ?? 0;
  const allSettled = isExpenseSettled(expense);

  return (
    <Pressable onPress={onPress} style={[styles.expenseItem, settled && { opacity: 0.6 }]}>
      {/* Category icon */}
      <View style={[styles.expenseIcon, { backgroundColor: catStyle.bg }]}>
        <IconComp size={16} color={catStyle.text} />
      </View>

      {/* Content */}
      <View style={styles.expenseContent}>
        <Text style={styles.expenseTitle} numberOfLines={1}>{expense.title}</Text>
        <Text style={styles.expenseMeta}>
          {isPayer ? "Vos pagaste" : `${expense.paidBy.name} pagó`}
          {expense.subcategory !== "GENERAL" ? ` · ${SUBCATEGORY_LABELS[expense.subcategory] ?? ""}` : ""}
        </Text>
        {!isSolo && mySplit && !isPayer && myAmount > 0 && (
          <Text style={[styles.expenseSplitInfo, allSettled ? styles.settledText : { color: colors.errorText }]}>
            Te toca {formatAmountFull(myAmount)}
          </Text>
        )}
        {!isSolo && isPayer && !allSettled && expense.amount - myAmount > 0.01 && (
          <Text style={[styles.expenseSplitInfo, { color: colors.successText }]}>
            Te deben {formatAmountFull(expense.amount - myAmount)}
          </Text>
        )}
      </View>

      {/* Amount */}
      <Text style={styles.expenseAmount}>{formatAmountFull(expense.amount)}</Text>
    </Pressable>
  );
}

// ─── ContextualInviteCard ────────────────────────────────────────────────────

function ContextualInviteCard({ inviteCode, householdName, onDismiss }: {
  inviteCode: string;
  householdName: string;
  onDismiss: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleInvite = async () => {
    const baseUrl = mobileConfig.oauthBaseUrl;
    const inviteUrl = `${baseUrl}/join/${inviteCode}`;
    const message = `Te invito a unirte a mi hogar "${householdName}" en Habita 🏠\n\n${inviteUrl}`;
    try {
      await Share.share({ message });
    } catch {
      // user cancelled
    }
  };

  return (
    <View style={styles.inviteCard}>
      <Pressable onPress={onDismiss} style={styles.inviteCardDismiss} hitSlop={8}>
        <X size={14} color={colors.mutedForeground} />
      </Pressable>
      <View style={styles.inviteCardRow}>
        <View style={styles.inviteCardIcon}>
          <UserPlus size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.inviteCardTitle}>¿Compartís el hogar?</Text>
          <Text style={styles.inviteCardSubtitle}>
            Invitá a alguien para dividir gastos automáticamente.
          </Text>
        </View>
      </View>
      <Pressable onPress={() => void handleInvite()} style={styles.inviteCardBtn}>
        <Text style={styles.inviteCardBtnText}>Invitar</Text>
      </Pressable>
    </View>
  );
}

// ─── ExpenseGroups (date-grouped sections) ───────────────────────────────────

function ExpenseGroups({
  groups,
  currentMemberId,
  settled,
  isSolo,
  onItemPress,
}: {
  groups: Array<{ label: string; items: SerializedExpense[] }>;
  currentMemberId: string;
  settled: boolean;
  isSolo: boolean;
  onItemPress: (expense: SerializedExpense) => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={{ gap: 16 }}>
      {groups.map((group) => (
        <View key={group.label}>
          <Text style={styles.dateGroupLabel}>{group.label}</Text>
          <View style={{ gap: 4 }}>
            {group.items.map((expense) => (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                currentMemberId={currentMemberId}
                settled={settled}
                isSolo={isSolo}
                onPress={() => onItemPress(expense)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── EditSheet ───────────────────────────────────────────────────────────────

interface EditSheetProps {
  expense: SerializedExpense;
  onClose: () => void;
  onSave: (expenseId: string, input: { title: string; amount: number }) => Promise<void>;
  onDelete: (expenseId: string) => void;
  isSaving: boolean;
}

function EditSheet({ expense, onClose, onSave, onDelete, isSaving }: EditSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState(expense.title);
  const [amount, setAmount] = useState(String(expense.amount));

  const handleSave = async () => {
    const parsed = Number(amount.replace(",", "."));
    if (!title.trim() || Number.isNaN(parsed) || parsed <= 0) return;
    await onSave(expense.id, { title: title.trim(), amount: parsed });
    onClose();
  };

  return (
    <BottomSheet visible onClose={onClose} title="Editar gasto" scrollable={false}>
      <View style={styles.sheetBody}>
        <StyledTextInput label="Descripción" value={title} onChangeText={setTitle} placeholder="Ej: Supermercado" />
        <StyledTextInput
          label="Monto"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0"
          leftIcon={<Text style={{ color: colors.mutedForeground, fontSize: 16, fontFamily: fontFamily.sans }}>$</Text>}
        />
        <View style={styles.sheetActions}>
          <Button
            variant="destructive"
            onPress={() => {
              Alert.alert("Eliminar gasto", "¿Eliminar este gasto?", [
                { text: "Cancelar", style: "cancel" },
                { text: "Eliminar", style: "destructive", onPress: () => { onDelete(expense.id); onClose(); } },
              ]);
            }}
            style={{ flex: 1 }}
          >
            Eliminar
          </Button>
          <Button onPress={() => void handleSave()} loading={isSaving} style={{ flex: 2 }}>
            Guardar
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

// ─── FundTab (inline) ──────────────────────────────────────────────────────

function FundTabContent() {
  const { me, activeHouseholdId } = useMobileAuth();
  const colors = useThemeColors();
  const fundStyles = useMemo(() => createFundStyles(colors), [colors]);
  const fundQuery = useFund();
  const contributeM = useContributeToFund();
  const setupM = useSetupFund();
  const { data: membersData } = useMembers();
  const members = membersData?.members ?? [];

  const [showContribute, setShowContribute] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [contributeAmount, setContributeAmount] = useState("");
  const [contributeNotes, setContributeNotes] = useState("");
  const [setupName, setSetupName] = useState("Fondo Común");
  const [setupTarget, setSetupTarget] = useState("");
  const [setupCategories, setSetupCategories] = useState<string[]>(["RENT", "UTILITIES", "GROCERIES", "HOME"]);
  const [setupAllocations, setSetupAllocations] = useState<Record<string, string>>({});

  const myMemberId = me?.members.find((m) => m.householdId === activeHouseholdId)?.id;
  const fund = fundQuery.data ?? null;
  const myStatus = fund?.memberStatuses.find((s) => s.memberId === myMemberId);

  const fmtAmt = (n: number) => `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });

  const handleContribute = () => {
    const parsed = parseFloat(contributeAmount.replace(",", "."));
    if (!parsed || parsed <= 0) {
      Alert.alert("Monto inválido", "Ingresá un monto mayor a 0.");
      return;
    }
    contributeM.mutate(
      { amount: parsed, notes: contributeNotes || undefined },
      {
        onSuccess: () => {
          setShowContribute(false);
          setContributeAmount("");
          setContributeNotes("");
          Alert.alert("¡Listo!", "Tu aporte quedó registrado.");
        },
        onError: (err) => Alert.alert("Ocurrió un error", getMobileErrorMessage(err)),
      },
    );
  };

  const handleSetup = () => {
    const parsedTarget = parseFloat(setupTarget.replace(",", "."));
    if (!parsedTarget || parsedTarget <= 0) {
      Alert.alert("Objetivo inválido", "Ingresá un objetivo mensual mayor a 0.");
      return;
    }
    if (setupCategories.length === 0) {
      Alert.alert("Sin categorías", "Seleccioná al menos una categoría para el fondo.");
      return;
    }
    const memberAllocations = members
      .map((m) => ({
        memberId: m.id,
        amount: parseFloat((setupAllocations[m.id] ?? "0").replace(",", ".")) || 0,
      }))
      .filter((a) => a.amount > 0);

    setupM.mutate(
      {
        name: setupName || "Fondo Común",
        monthlyTarget: parsedTarget,
        fundCategories: setupCategories,
        allocations: memberAllocations.length > 0 ? memberAllocations : undefined,
      },
      {
        onSuccess: () => setShowSetup(false),
        onError: (err) => Alert.alert("Ocurrió un error", getMobileErrorMessage(err)),
      },
    );
  };

  if (fundQuery.isLoading) {
    return <View style={fundStyles.container}><SkeletonCard /><SkeletonCard /></View>;
  }

  if (!fund) {
    return (
      <View style={fundStyles.container}>
        <EmptyState
          icon={<Landmark size={32} color={colors.mutedForeground} />}
          title="Sin fondo configurado"
          subtitle="Un fondo común permite que el hogar comparta gastos de forma transparente."
          actionLabel="Crear fondo"
          onAction={() => setShowSetup(true)}
        />
        {showSetup ? (
          <BottomSheet visible onClose={() => setShowSetup(false)}>
            <Text style={fundStyles.sheetTitle}>Configurar fondo</Text>
            <Text style={fundStyles.sheetSubtitle}>
              Definí cuánto pone cada uno y qué gastos cubre el fondo.
            </Text>
            <Text style={fundStyles.fieldLabel}>Nombre del fondo</Text>
            <StyledTextInput value={setupName} onChangeText={setSetupName} placeholder="Fondo Común" containerStyle={fundStyles.fieldInput} />
            <Text style={fundStyles.fieldLabel}>Objetivo mensual ($)</Text>
            <StyledTextInput value={setupTarget} onChangeText={(v) => {
              setSetupTarget(v);
              const parsed = parseFloat(v.replace(",", "."));
              if (parsed > 0 && members.length > 0) {
                const share = String(Math.round(parsed / members.length));
                const allocs: Record<string, string> = {};
                for (const m of members) allocs[m.id] = share;
                setSetupAllocations(allocs);
              }
            }} keyboardType="numeric" placeholder="ej: 50000" containerStyle={fundStyles.fieldInput} />
            <Text style={fundStyles.fieldLabel}>Categorías del fondo</Text>
            <View style={fundStyles.chipGrid}>
              {FUND_CATEGORIES.map((cat) => {
                const isActive = setupCategories.includes(cat.value);
                return (
                  <Pressable key={cat.value} onPress={() => setSetupCategories((prev) =>
                    prev.includes(cat.value) ? prev.filter((c) => c !== cat.value) : [...prev, cat.value]
                  )} style={[fundStyles.chip, isActive && fundStyles.chipActive]}>
                    <Text style={[fundStyles.chipLabel, isActive && fundStyles.chipLabelActive]}>{cat.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {members.length > 0 ? (
              <>
                <Text style={fundStyles.fieldLabel}>Cuota mensual por miembro</Text>
                <Text style={fundStyles.fieldHint}>
                  Se divide en partes iguales al cambiar el objetivo. Podés ajustar cada cuota.
                </Text>
                {members.map((m) => (
                  <View key={m.id} style={fundStyles.allocationRow}>
                    <Text style={fundStyles.allocationName} numberOfLines={1}>{m.name}</Text>
                    <StyledTextInput value={setupAllocations[m.id] ?? ""} onChangeText={(v) =>
                      setSetupAllocations((prev) => ({ ...prev, [m.id]: v }))} keyboardType="numeric" placeholder="0" containerStyle={fundStyles.allocationInput} />
                  </View>
                ))}
                {(() => {
                  const allocTotal = members.reduce((sum, m) => sum + (parseFloat((setupAllocations[m.id] ?? "0").replace(",", ".")) || 0), 0);
                  const targetNum = parseFloat(setupTarget.replace(",", ".")) || 0;
                  const diff = targetNum - allocTotal;
                  if (targetNum <= 0) return null;
                  return (
                    <Text style={[fundStyles.allocationSummary, Math.abs(diff) > 1 && { color: colors.errorText }]}>
                      Total cuotas: {fmtAmt(allocTotal)} / {fmtAmt(targetNum)}
                      {Math.abs(diff) > 1 ? ` (${diff > 0 ? "faltan" : "sobran"} ${fmtAmt(Math.abs(diff))})` : ""}
                    </Text>
                  );
                })()}
              </>
            ) : null}
            <Button loading={setupM.isPending} onPress={handleSetup} style={fundStyles.actionBtn}>Crear fondo</Button>
            <Button variant="ghost" onPress={() => setShowSetup(false)}>Cancelar</Button>
          </BottomSheet>
        ) : null}
      </View>
    );
  }

  return (
    <View style={fundStyles.container}>
      {/* Balance card */}
      <View style={[fundStyles.balanceCard, fund.balance < 0 && fundStyles.balanceNegative]}>
        <Text style={fundStyles.balanceLabel}>Saldo disponible</Text>
        <Text style={[fundStyles.balanceAmount, { color: fund.balance < 0 ? colors.errorText : colors.text }]}>
          {fmtAmt(fund.balance)}
        </Text>
        {fund.monthlyTarget ? (
          <View style={fundStyles.progressWrap}>
            <View style={fundStyles.progressTrack}>
              <View style={[fundStyles.progressFill, { width: `${Math.min((fund.contributedThisPeriod / fund.monthlyTarget) * 100, 100)}%` as `${number}%` }]} />
            </View>
            <Text style={fundStyles.progressLabel}>
              {fmtAmt(fund.contributedThisPeriod)} de {fmtAmt(fund.monthlyTarget)} meta mensual
            </Text>
          </View>
        ) : null}
      </View>

      {/* Stats row */}
      <View style={fundStyles.statsRow}>
        <View style={[fundStyles.statCard, { backgroundColor: colors.successBg }]}>
          <View style={fundStyles.statHeader}>
            <TrendingUp size={14} color={colors.successText} />
            <Text style={fundStyles.statLabel}>Aportado</Text>
          </View>
          <Text style={[fundStyles.statValue, { color: colors.successText }]}>{fmtAmt(fund.contributedThisPeriod)}</Text>
        </View>
        <View style={[fundStyles.statCard, { backgroundColor: colors.errorBg }]}>
          <View style={fundStyles.statHeader}>
            <TrendingDown size={14} color={colors.errorText} />
            <Text style={fundStyles.statLabel}>Gastado</Text>
          </View>
          <Text style={[fundStyles.statValue, { color: colors.errorText }]}>{fmtAmt(fund.spentThisPeriod)}</Text>
        </View>
      </View>

      {/* My contribution CTA */}
      {myStatus ? (
        <View style={[fundStyles.myCta, myStatus.pending > 0 ? { backgroundColor: colors.warningBg, borderColor: `${colors.warningText}40` } : { backgroundColor: colors.successBg, borderColor: `${colors.successText}40` }]}>
          <View style={{ flex: 1 }}>
            <Text style={fundStyles.myCtaTitle}>Tu cuota este mes</Text>
            <Text style={fundStyles.myCtaSub}>
              {fmtAmt(myStatus.contributed)} de {fmtAmt(myStatus.allocation)} aportados
            </Text>
          </View>
          {myStatus.pending > 0 ? (
            <Pressable onPress={() => { setContributeAmount(String(myStatus.pending)); setShowContribute(true); }} style={fundStyles.contributeBtn}>
              <Plus size={14} color={colors.white} />
              <Text style={fundStyles.contributeBtnText}>Aportar</Text>
            </Pressable>
          ) : (
            <View style={fundStyles.paidBadge}>
              <Text style={fundStyles.paidBadgeText}>Al día</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Member statuses */}
      {fund.memberStatuses.length > 0 ? (
        <Card>
          <CardContent>
            <Text style={fundStyles.sectionTitle}>Cuotas del período</Text>
            {fund.memberStatuses.map((ms) => (
              <View key={ms.memberId} style={fundStyles.memberRow}>
                <Text style={[fundStyles.memberName, ms.memberId === myMemberId && { fontWeight: "700" as const }]}>
                  {ms.memberName}{ms.memberId === myMemberId ? " (vos)" : ""}
                </Text>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={fundStyles.memberContributed}>{fmtAmt(ms.contributed)} / {fmtAmt(ms.allocation)}</Text>
                  {ms.pending > 0 ? <Text style={fundStyles.memberPending}>Debe {fmtAmt(ms.pending)}</Text> : null}
                </View>
              </View>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Recent expenses */}
      {fund.recentExpenses.length > 0 ? (
        <Card>
          <CardContent>
            <Text style={fundStyles.sectionTitle}>Gastos recientes del fondo</Text>
            {fund.recentExpenses.map((exp) => (
              <View key={exp.id} style={fundStyles.txRow}>
                <View>
                  <Text style={fundStyles.txTitle}>{exp.title}</Text>
                  <Text style={fundStyles.txDate}>{fmtDate(exp.date)}</Text>
                </View>
                <Text style={fundStyles.txNeg}>-{fmtAmt(exp.amount)}</Text>
              </View>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {showContribute ? (
        <BottomSheet visible onClose={() => setShowContribute(false)}>
          <Text style={fundStyles.sheetTitle}>Registrar aporte</Text>
          <Text style={fundStyles.fieldLabel}>Monto</Text>
          <StyledTextInput value={contributeAmount} onChangeText={setContributeAmount} keyboardType="numeric" placeholder="0" style={fundStyles.fieldInput} />
          <Text style={fundStyles.fieldLabel}>Notas (opcional)</Text>
          <StyledTextInput value={contributeNotes} onChangeText={setContributeNotes} placeholder="ej: transferencia banco" style={fundStyles.fieldInput} />
          <Button loading={contributeM.isPending} onPress={handleContribute} style={fundStyles.actionBtn}>Confirmar aporte</Button>
          <Button variant="ghost" onPress={() => setShowContribute(false)}>Cancelar</Button>
        </BottomSheet>
      ) : null}
    </View>
  );
}

const FUND_CATEGORIES = [
  { value: "RENT", label: "Alquiler" },
  { value: "UTILITIES", label: "Servicios" },
  { value: "GROCERIES", label: "Supermercado" },
  { value: "HOME", label: "Hogar" },
  { value: "FOOD", label: "Comida" },
  { value: "HEALTH", label: "Salud" },
  { value: "ENTERTAINMENT", label: "Entretenimiento" },
  { value: "EDUCATION", label: "Educación" },
  { value: "TRANSPORT", label: "Transporte" },
  { value: "OTHER", label: "Otros" },
];

// ─── SaldosTab (inline) ──────────────────────────────────────────────────────

function SaldosTabContent({ currentMemberId }: { currentMemberId: string }) {
  const colors = useThemeColors();
  const saldosStyles = useMemo(() => createSaldosStyles(colors), [colors]);
  const balancesQuery = useExpenseBalances();
  const insightsQuery = useExpenseInsights();
  const settleDebts = useSettleDebts();

  const balances = balancesQuery.data?.balances ?? [];
  const transactions = balancesQuery.data?.transactions ?? [];
  const insights = insightsQuery.data as ExpenseInsightsResponse | undefined;

  const myBalance = balances.find((b) => b.memberId === currentMemberId);
  const netBalance = myBalance?.balance ?? 0;

  const fmtAmt = (n: number) => `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
  const fmtAmtFull = (n: number) => `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

  const handleSettleAll = () => {
    if (transactions.length === 0) return;
    Alert.alert(
      "Liquidar todas las deudas",
      `Se van a liquidar ${transactions.length} deuda${transactions.length !== 1 ? "s" : ""}.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            for (const tx of transactions) {
              await settleDebts.mutateAsync({ fromMemberId: tx.fromMemberId, toMemberId: tx.toMemberId });
            }
            Alert.alert("Listo", "Todas las deudas fueron liquidadas.");
          },
        },
      ],
    );
  };

  if (balancesQuery.isLoading) {
    return <View style={saldosStyles.container}><SkeletonCard /><SkeletonCard /></View>;
  }

  return (
    <View style={saldosStyles.container}>
      {/* Hero balance banner */}
      <View style={[saldosStyles.heroBanner,
        netBalance > 0.01 ? { backgroundColor: colors.successBg, borderColor: `${colors.successText}40` }
        : netBalance < -0.01 ? { backgroundColor: colors.errorBg, borderColor: `${colors.errorText}40` }
        : { backgroundColor: `${colors.muted}66`, borderColor: colors.border }
      ]}>
        {Math.abs(netBalance) <= 0.01 ? (
          <View style={saldosStyles.heroContent}>
            <CheckCircle2 size={24} color={colors.mutedForeground} />
            <Text style={saldosStyles.heroEven}>Están al día</Text>
          </View>
        ) : (
          <View style={saldosStyles.heroContent}>
            <DollarSign size={24} color={netBalance > 0 ? colors.successText : colors.errorText} />
            <View>
              <Text style={[saldosStyles.heroAmount, { color: netBalance > 0 ? colors.successText : colors.errorText }]}>
                {netBalance > 0
                  ? `Te deben ${fmtAmtFull(netBalance)}`
                  : `Debés ${fmtAmtFull(Math.abs(netBalance))}`}
              </Text>
              <Text style={saldosStyles.heroSub}>
                {netBalance > 0 ? "Tenés saldo a favor" : "Tenés saldo pendiente"}
              </Text>
            </View>
          </View>
        )}
        {transactions.length > 0 ? (
          <Pressable onPress={handleSettleAll} style={saldosStyles.settleBtn}>
            <Text style={saldosStyles.settleBtnText}>Liquidar todo</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Transferencias link */}
      <Pressable
        onPress={() => router.push("/(app)/transfers")}
        style={saldosStyles.transfersLink}
      >
        <ArrowLeftRight size={14} color={colors.mutedForeground} />
        <Text style={saldosStyles.transfersLinkText}>Transferencias →</Text>
      </Pressable>

      {/* Debt transactions */}
      {transactions.length > 0 ? (
        <Card>
          <CardContent>
            <Text style={saldosStyles.sectionTitle}>Deudas pendientes</Text>
            {transactions.map((tx, i) => {
              const isMe = tx.fromMemberId === currentMemberId;
              return (
                <View key={`${tx.fromMemberId}-${tx.toMemberId}`} style={[saldosStyles.debtRow, i < transactions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                  <View style={saldosStyles.debtInfo}>
                    <HandCoins size={16} color={isMe ? colors.errorText : colors.successText} />
                    <View style={{ flex: 1 }}>
                      <Text style={saldosStyles.debtText}>
                        {isMe
                          ? `Le debés a ${tx.toMemberName}`
                          : `${tx.fromMemberName} te debe`}
                      </Text>
                    </View>
                  </View>
                  <Text style={[saldosStyles.debtAmount, { color: isMe ? colors.errorText : colors.successText }]}>
                    {fmtAmtFull(tx.amount)}
                  </Text>
                </View>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {/* Category breakdown from insights */}
      {insights && insights.categoryBreakdown.length > 0 ? (
        <Card>
          <CardContent>
            <Text style={saldosStyles.sectionTitle}>Categorías variables</Text>
            {insights.categoryBreakdown.slice(0, 6).map((cat) => {
              const catLabel = CATEGORY_LABELS[cat.category as ExpenseCategory] ?? cat.category;
              const catColor = getCategoryColor(cat.category);
              return (
                <View key={cat.category} style={saldosStyles.categoryRow}>
                  <View style={saldosStyles.categoryLeft}>
                    <View style={[saldosStyles.categoryDot, { backgroundColor: catColor.text }]} />
                    <Text style={saldosStyles.categoryName}>{catLabel}</Text>
                  </View>
                  <Text style={saldosStyles.categoryAmount}>{fmtAmt(cat.amount)}</Text>
                </View>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {/* Insights summary */}
      {insights ? (
        <Card>
          <CardContent>
            <Text style={saldosStyles.sectionTitle}>Resumen del mes</Text>
            <View style={saldosStyles.insightRow}>
              <Text style={saldosStyles.insightLabel}>Total gastado</Text>
              <Text style={saldosStyles.insightValue}>{fmtAmt(insights.thisMonthTotal)}</Text>
            </View>
            <View style={saldosStyles.insightRow}>
              <Text style={saldosStyles.insightLabel}>Proyección</Text>
              <Text style={saldosStyles.insightValue}>{fmtAmt(insights.projectedTotal)}</Text>
            </View>
            {insights.upcomingServicesCount > 0 ? (
              <View style={saldosStyles.insightRow}>
                <Text style={saldosStyles.insightLabel}>Servicios próximos</Text>
                <Text style={saldosStyles.insightValue}>{insights.upcomingServicesCount} (~{fmtAmt(insights.upcomingServicesCost)})</Text>
              </View>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Tips */}
      {insights?.spendingTips && insights.spendingTips.length > 0 ? (
        <Card>
          <CardContent>
            <Text style={saldosStyles.sectionTitle}>Oportunidades de ahorro</Text>
            {insights.spendingTips.map((tip) => (
              <View key={tip.id} style={[saldosStyles.tipCard,
                tip.severity === "critica" ? { backgroundColor: colors.errorBg }
                : tip.severity === "alerta" ? { backgroundColor: colors.warningBg }
                : { backgroundColor: colors.infoBg }
              ]}>
                <Text style={saldosStyles.tipText}>{tip.emoji} {tip.message}</Text>
              </View>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ExpensesScreen() {
  const { me, activeHouseholdId } = useMobileAuth();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isFirstVisit, dismiss: dismissGuide } = useFirstVisit("gastos");
  const { data, isLoading, isError, error, refetch, isRefetching } = useExpenses();
  const insightsQuery = useExpenseInsights();
  const householdQuery = useHouseholdDetail();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const [activeTab, setActiveTab] = useState<Tab>("gastos");
  const [editTarget, setEditTarget] = useState<SerializedExpense | null>(null);
  const [showSettled, setShowSettled] = useState(false);
  const [subcategoryFilter, setSubcategoryFilter] = useState("ALL");
  const [inviteDismissed, setInviteDismissed] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem("habita_expense_invite_dismissed").then((val) => {
      if (val === "1") setInviteDismissed(true);
    });
  }, []);

  const handleDismissInvite = () => {
    setInviteDismissed(true);
    void AsyncStorage.setItem("habita_expense_invite_dismissed", "1");
  };

  const activeMembers = me?.members.filter((m) => m.householdId === activeHouseholdId) ?? [];
  const currentMemberId = activeMembers[0]?.id ?? "";
  const isSolo = activeMembers.length <= 1;

  // Progressive disclosure: hide Fondo/Saldos tabs for solo households
  const tabItems = useMemo(
    () => isSolo ? ALL_TAB_ITEMS.filter((t) => t.key === "gastos") : ALL_TAB_ITEMS,
    [isSolo],
  );

  const inviteCode = householdQuery.data?.household?.inviteCode ?? null;
  const householdName = householdQuery.data?.household?.name ?? "";

  const expenses = data?.expenses ?? [];
  const insightsData = insightsQuery.data as InsightsData | undefined;

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    if (subcategoryFilter === "ALL") return expenses;
    return expenses.filter((e) => e.subcategory === subcategoryFilter);
  }, [expenses, subcategoryFilter]);

  // Date-grouped sections
  const pendingExpenses = useMemo(() => filteredExpenses.filter((e) => !isExpenseSettled(e)), [filteredExpenses]);
  const settledExpenses = useMemo(() => filteredExpenses.filter((e) => isExpenseSettled(e)), [filteredExpenses]);
  const allGroups = useMemo(() => isSolo ? groupByDate(filteredExpenses) : [], [filteredExpenses, isSolo]);
  const pendingGroups = useMemo(() => isSolo ? [] : groupByDate(pendingExpenses), [pendingExpenses, isSolo]);
  const settledGroups = useMemo(() => isSolo ? [] : groupByDate(settledExpenses), [settledExpenses, isSolo]);

  const handleSave = async (expenseId: string, input: { title: string; amount: number }) => {
    await updateExpense.mutateAsync({ expenseId, payload: { title: input.title, amount: input.amount } });
  };

  const handleDelete = useCallback(async (expenseId: string) => {
    await deleteExpense.mutateAsync(expenseId);
  }, [deleteExpense]);

  // Tab routing — all inline now
  const handleTabChange = (key: string) => {
    setActiveTab(key as Tab);
  };

  // Quick-add → navigate to new-expense with pre-filled data
  const handleQuickAdd = useCallback((_preset: FrequentExpense) => {
    router.push("/(app)/new-expense");
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Controlá</Text>
        <Pressable onPress={() => router.push("/(app)/new-expense")} style={styles.addBtn} hitSlop={4}>
          <Plus size={16} color={colors.white} strokeWidth={2.5} />
          <Text style={styles.addBtnText}>Nuevo gasto</Text>
        </Pressable>
      </View>

      {/* Tab bar — always visible */}
      <View style={styles.tabRow}>
        <TabBar items={tabItems} activeKey={activeTab} onChange={handleTabChange} />
      </View>

      {isFirstVisit ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <SectionGuideCard
            steps={[
              {
                icon: <CreditCard size={16} color={colors.primary} />,
                title: "Registrá gastos",
                description: "Anotá quién pagó qué y cuánto",
              },
              {
                icon: <BarChart3 size={16} color={colors.primary} />,
                title: "Vé quién gastó más",
                description: "El resumen muestra balances por miembro",
              },
              {
                icon: <ArrowLeftRight size={16} color={colors.primary} />,
                title: "Liquidá deudas",
                description: "Habita calcula las transferencias óptimas",
              },
            ]}
            onDismiss={dismissGuide}
          />
        </View>
      ) : null}

      {/* ── Gastos tab ── */}
      {activeTab === "gastos" ? (
        <>
          {isLoading ? (
            <ScrollView bounces={false} contentContainerStyle={styles.scrollContent}>
              <SkeletonCard style={{ marginBottom: spacing.sm }} />
              <SkeletonCard lines={2} style={{ marginBottom: spacing.sm }} />
              <SkeletonCard lines={4} style={{ marginBottom: spacing.sm }} />
            </ScrollView>
          ) : isError ? (
            <Card style={{ margin: spacing.lg }}>
              <CardContent>
                <Text style={{ color: colors.destructive, fontSize: 13, fontFamily: fontFamily.sans }}>{getMobileErrorMessage(error)}</Text>
                <Button variant="ghost" onPress={() => void refetch()} style={{ marginTop: spacing.sm }}>
                  Reintentar
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ScrollView
              bounces={false}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  tintColor={colors.primary}
                  onRefresh={() => {
                    void refetch();
                    void insightsQuery.refetch();
                  }}
                />
              }
            >
              {insightsData && <FinancialPulseCard data={insightsData} />}
              {/* Progressive disclosure: only show secondary insights after user has expenses */}
              {expenses.length > 0 && insightsData?.spendingTips && insightsData.spendingTips.length > 0 && (
                <View style={styles.section}>
                  <SpendingTips tips={insightsData.spendingTips as Array<{ id: string; emoji: string; message: string; severity: string }>} />
                </View>
              )}
              {expenses.length > 0 && insightsData && insightsData.upcomingServicesCount > 0 && (
                <View style={styles.section}>
                  <UpcomingServicesNotice count={insightsData.upcomingServicesCount} cost={insightsData.upcomingServicesCost} />
                </View>
              )}
              {expenses.length > 0 && insightsData?.frequentExpenses && insightsData.frequentExpenses.length > 0 && (
                <View style={styles.section}>
                  <QuickAddPills expenses={insightsData.frequentExpenses as FrequentExpense[]} onQuickAdd={handleQuickAdd} />
                </View>
              )}
              {isSolo && !inviteDismissed && expenses.length >= 3 && inviteCode ? (
                <View style={styles.section}>
                  <ContextualInviteCard
                    inviteCode={inviteCode}
                    householdName={householdName}
                    onDismiss={handleDismissInvite}
                  />
                </View>
              ) : null}
              {expenses.length === 0 ? (
                <EmptyState
                  icon={<Receipt size={48} color={colors.mutedForeground} />}
                  title="Registrá el primer gasto"
                  subtitle={isSolo
                    ? "Anotá tus gastos para llevar el control de tus finanzas."
                    : "Anotá los gastos compartidos y Habita calcula quién le debe a quién."}
                  steps={[
                    { label: "Registrá un gasto con el botón +" },
                    { label: "Asigná quién pagó y quién participa" },
                    { label: "Consultá balances y liquidá deudas" },
                  ]}
                />
              ) : (
                <View style={{ gap: spacing.md }}>
                  <Text style={styles.sectionLabel}>Gastos recientes</Text>
                  <SubcategoryFilters expenses={expenses} active={subcategoryFilter} onChange={setSubcategoryFilter} />
                  {filteredExpenses.length === 0 ? (
                    <Text style={styles.noResultsText}>No hay gastos en la subcategoría seleccionada.</Text>
                  ) : isSolo ? (
                    <ExpenseGroups groups={allGroups} currentMemberId={currentMemberId} settled={false} isSolo={isSolo} onItemPress={setEditTarget} />
                  ) : (
                    <>
                      {pendingGroups.length > 0 ? (
                        <ExpenseGroups groups={pendingGroups} currentMemberId={currentMemberId} settled={false} isSolo={isSolo} onItemPress={setEditTarget} />
                      ) : (
                        <Text style={styles.noResultsText}>No hay gastos pendientes</Text>
                      )}
                      {settledExpenses.length > 0 && (
                        <>
                          <Pressable onPress={() => setShowSettled(!showSettled)} style={styles.toggleSettled}>
                            {showSettled ? (
                              <><ChevronUp size={14} color={colors.mutedForeground} /><Text style={styles.toggleSettledText}>Ocultar liquidados</Text></>
                            ) : (
                              <><ChevronDown size={14} color={colors.mutedForeground} /><Text style={styles.toggleSettledText}>Mostrar {settledExpenses.length} liquidado{settledExpenses.length !== 1 ? "s" : ""}</Text></>
                            )}
                          </Pressable>
                          {showSettled && <ExpenseGroups groups={settledGroups} currentMemberId={currentMemberId} settled isSolo={isSolo} onItemPress={setEditTarget} />}
                        </>
                      )}
                    </>
                  )}
                </View>
              )}
              <View style={styles.bottomPadding} />
            </ScrollView>
          )}
          {editTarget ? (
            <EditSheet expense={editTarget} onClose={() => setEditTarget(null)} onSave={handleSave} onDelete={(id) => void handleDelete(id)} isSaving={updateExpense.isPending} />
          ) : null}
        </>
      ) : null}

      {/* ── Fondo tab ── */}
      {activeTab === "fondo" ? (
        <ScrollView
          style={styles.tabScroll}
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} tintColor={colors.primary} onRefresh={() => void refetch()} />
          }
        >
          <FundTabContent />
          <View style={styles.bottomPadding} />
        </ScrollView>
      ) : null}

      {/* ── Saldos tab ── */}
      {activeTab === "saldos" ? (
        <ScrollView
          style={styles.tabScroll}
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} tintColor={colors.primary} onRefresh={() => void refetch()} />
          }
        >
          <SaldosTabContent currentMemberId={currentMemberId} />
          <View style={styles.bottomPadding} />
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    headerTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 24,
      fontWeight: "700",
      letterSpacing: -0.3,
      color: c.text,
    },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.primary,
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
    },
    addBtnText: {
      fontFamily: fontFamily.sans,
      color: c.white,
      fontWeight: "600",
      fontSize: 13,
    },
    tabRow: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    tabScroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    section: {
      marginBottom: spacing.md,
    },

    // FinancialPulse hero
    heroCard: {
      borderRadius: radius.xl,
      paddingHorizontal: 20,
      paddingVertical: 16,
      marginBottom: spacing.md,
    },
    heroEmptyTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "500",
      color: c.text,
      textAlign: "center",
      marginTop: 12,
    },
    heroEmptySubtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      textAlign: "center",
      marginTop: 4,
    },
    heroAlertRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    heroAlertTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "500",
    },
    heroAlertSubtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      marginTop: 2,
      lineHeight: 16,
    },
    heroLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: c.mutedForeground,
    },
    heroStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
    },
    heroStatusText: {
      fontFamily: fontFamily.sans,
      fontSize: 16,
      fontWeight: "600",
      color: c.text,
    },
    heroAmountRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 8,
      marginTop: 12,
    },
    heroAmountLg: {
      fontFamily: fontFamily.sans,
      fontSize: 24,
      fontWeight: "700",
      color: c.text,
    },
    heroAmountSuffix: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.mutedForeground,
    },
    heroProjection: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      marginTop: 4,
    },

    // Trend badge
    trendBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    trendTextFlat: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
    },
    trendTextDirectional: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "500",
    },

    // Quick-add pills
    pillsContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingBottom: 4,
    },
    pillsLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      flexShrink: 0,
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 6,
      flexShrink: 0,
    },
    pillText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "500",
      color: c.text,
    },

    // Spending tips
    tipCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      borderRadius: radius.lg,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    tipSeverity: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    tipMessage: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.text,
      lineHeight: 20,
    },

    // Upcoming services notice
    servicesNotice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      borderRadius: radius.lg,
      backgroundColor: c.warningBg,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    servicesNoticeText: {
      fontFamily: fontFamily.sans,
      flex: 1,
      fontSize: 14,
      color: c.warningText,
      lineHeight: 20,
    },

    // Subcategory filters
    filterRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingBottom: 4,
    },
    filterPill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 4,
      flexShrink: 0,
    },
    filterPillActive: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}1A`,
    },
    filterPillText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "500",
      color: c.mutedForeground,
    },
    filterPillTextActive: {
      color: c.primary,
    },

    // Section label
    sectionLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: c.mutedForeground,
      marginBottom: 4,
    },

    // No results
    noResultsText: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.mutedForeground,
      textAlign: "center",
      paddingVertical: 16,
    },

    // Expense item (matches web ExpenseItem)
    expenseItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      borderRadius: radius.lg,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    expenseIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.lg,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginTop: 2,
    },
    expenseContent: {
      flex: 1,
      minWidth: 0,
    },
    expenseTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "500",
      color: c.text,
    },
    expenseMeta: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      marginTop: 2,
    },
    expenseSplitInfo: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "500",
      marginTop: 2,
    },
    settledText: {
      color: c.mutedForeground,
      textDecorationLine: "line-through",
    },
    expenseAmount: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600",
      color: c.text,
      flexShrink: 0,
    },

    // Date group label
    dateGroupLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      color: c.mutedForeground,
      marginBottom: 8,
    },

    // Toggle settled
    toggleSettled: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 8,
    },
    toggleSettledText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "500",
      color: c.mutedForeground,
    },

    // Edit sheet
    sheetBody: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
      gap: spacing.md,
    },
    sheetActions: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm,
    },

    // Bottom padding
    bottomPadding: {
      height: 120,
    },

    // Contextual invite card
    inviteCard: {
      backgroundColor: c.primaryLight,
      borderRadius: radius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: `${c.primary}30`,
      gap: spacing.sm,
    },
    inviteCardDismiss: {
      position: "absolute",
      top: spacing.sm,
      right: spacing.sm,
      zIndex: 1,
      padding: 4,
    },
    inviteCardRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      paddingRight: spacing.lg,
    },
    inviteCardIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${c.primary}20`,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    inviteCardTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600" as const,
      color: c.text,
    },
    inviteCardSubtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      marginTop: 2,
    },
    inviteCardBtn: {
      backgroundColor: c.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      alignSelf: "flex-start",
    },
    inviteCardBtnText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "600" as const,
      color: c.white,
    },
  });
}

// ─── Fund tab styles ──────────────────────────────────────────────────────────

function createFundStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { gap: spacing.sm },
    balanceCard: {
      borderRadius: radius.xl,
      backgroundColor: c.card,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    balanceNegative: { backgroundColor: c.errorBg, borderColor: `${c.errorText}40` },
    balanceLabel: { fontFamily: fontFamily.sans, fontSize: 13, color: c.mutedForeground },
    balanceAmount: { fontFamily: fontFamily.sans, fontSize: 32, fontWeight: "800", marginTop: 4 },
    progressWrap: { marginTop: spacing.sm },
    progressTrack: { height: 6, backgroundColor: c.border, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: c.primary, borderRadius: 3 },
    progressLabel: { fontFamily: fontFamily.sans, fontSize: 12, color: c.mutedForeground, marginTop: 4 },
    statsRow: { flexDirection: "row", gap: spacing.sm },
    statCard: { flex: 1, borderRadius: radius.xl, padding: spacing.md },
    statHeader: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
    statLabel: { fontFamily: fontFamily.sans, fontSize: 11, color: c.mutedForeground },
    statValue: { fontFamily: fontFamily.sans, fontSize: 18, fontWeight: "700" },
    myCta: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: radius.xl,
      borderWidth: 1,
      padding: spacing.md,
      gap: spacing.sm,
    },
    myCtaTitle: { fontFamily: fontFamily.sans, fontWeight: "700", color: c.text, fontSize: 14 },
    myCtaSub: { fontFamily: fontFamily.sans, color: c.mutedForeground, fontSize: 12, marginTop: 2 },
    contributeBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.primary,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
    },
    contributeBtnText: { fontFamily: fontFamily.sans, color: c.white, fontWeight: "600", fontSize: 13 },
    paidBadge: { backgroundColor: c.successBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
    paidBadgeText: { fontFamily: fontFamily.sans, color: c.successText, fontWeight: "700", fontSize: 13 },
    sectionTitle: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "700", color: c.text, marginBottom: spacing.sm },
    memberRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
    memberName: { fontFamily: fontFamily.sans, color: c.text, fontWeight: "500", fontSize: 14 },
    memberContributed: { fontFamily: fontFamily.sans, color: c.text, fontWeight: "600", fontSize: 13 },
    memberPending: { fontFamily: fontFamily.sans, color: c.errorText, fontSize: 11, marginTop: 2 },
    txRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
    txTitle: { fontFamily: fontFamily.sans, color: c.text, fontWeight: "500", fontSize: 14 },
    txDate: { fontFamily: fontFamily.sans, color: c.mutedForeground, fontSize: 12, marginTop: 2 },
    txNeg: { fontFamily: fontFamily.sans, color: c.errorText, fontWeight: "600", fontSize: 14 },
    sheetTitle: { fontFamily: fontFamily.sans, fontSize: 18, fontWeight: "700", color: c.text, marginBottom: spacing.md },
    fieldLabel: { fontFamily: fontFamily.sans, fontSize: 13, color: c.mutedForeground, marginBottom: spacing.xs },
    fieldInput: { marginBottom: spacing.md },
    actionBtn: { marginBottom: spacing.sm },
    chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
    chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.card },
    chipActive: { borderColor: c.primary, backgroundColor: c.primaryLight },
    chipLabel: { fontFamily: fontFamily.sans, fontSize: 13, fontWeight: "500", color: c.mutedForeground },
    chipLabelActive: { fontWeight: "700", color: c.primary },
    allocationRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm, gap: spacing.md },
    allocationName: { flex: 1, fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "500", color: c.text },
    allocationInput: { width: 100, marginBottom: 0 },
    sheetSubtitle: { fontFamily: fontFamily.sans, fontSize: 13, color: c.mutedForeground, marginBottom: spacing.md, lineHeight: 18 },
    fieldHint: { fontFamily: fontFamily.sans, fontSize: 12, color: c.mutedForeground, marginBottom: spacing.sm },
    allocationSummary: { fontFamily: fontFamily.sans, fontSize: 13, fontWeight: "600", color: c.mutedForeground, marginTop: spacing.xs, marginBottom: spacing.sm },
  });
}

// ─── Saldos tab styles ────────────────────────────────────────────────────────

function createSaldosStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { gap: spacing.sm },
    heroBanner: {
      borderRadius: radius.xl,
      borderWidth: 1,
      padding: spacing.lg,
      gap: spacing.md,
    },
    heroContent: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    heroEven: { fontFamily: fontFamily.sans, fontSize: 16, fontWeight: "600", color: c.mutedForeground },
    heroAmount: { fontFamily: fontFamily.sans, fontSize: 20, fontWeight: "700" },
    heroSub: { fontFamily: fontFamily.sans, fontSize: 12, color: c.mutedForeground, marginTop: 2 },
    settleBtn: {
      alignSelf: "flex-start",
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      backgroundColor: c.card,
    },
    settleBtnText: { fontFamily: fontFamily.sans, fontSize: 13, fontWeight: "500", color: c.text },
    sectionTitle: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "700", color: c.text, marginBottom: spacing.sm },
    debtRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm },
    debtInfo: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
    debtText: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "500", color: c.text },
    debtAmount: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "700" },
    categoryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
    categoryLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    categoryDot: { width: 8, height: 8, borderRadius: 4 },
    categoryName: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "500", color: c.text },
    categoryAmount: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "600", color: c.text },
    insightRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
    insightLabel: { fontFamily: fontFamily.sans, fontSize: 14, color: c.mutedForeground },
    insightValue: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "600", color: c.text },
    tipCard: { borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.xs },
    tipText: { fontFamily: fontFamily.sans, fontWeight: "600", fontSize: 13, color: c.text },
    transfersLink: { flexDirection: "row", alignItems: "center", gap: 6 },
    transfersLinkText: { fontFamily: fontFamily.sans, fontSize: 12, color: c.mutedForeground },
  });
}
