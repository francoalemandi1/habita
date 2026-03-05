import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Landmark, Plus, TrendingDown, TrendingUp } from "lucide-react-native";
import { useFund, useContributeToFund, useSetupFund } from "@/hooks/use-fund";
import { useMembers } from "@/hooks/use-members";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useThemeColors } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StyledTextInput } from "@/components/ui/text-input";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { fontFamily, radius, spacing, typography } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { MemberContributionStatus, CreateFundPayload } from "@/hooks/use-fund";

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

interface ContributeSheetProps {
  myStatus: MemberContributionStatus | undefined;
  onClose: () => void;
  onSubmit: (amount: number, notes: string) => void;
  isLoading: boolean;
}

function ContributeSheet({ myStatus, onClose, onSubmit, isLoading }: ContributeSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [amount, setAmount] = useState(String(myStatus?.pending ?? ""));
  const [notes, setNotes] = useState("");

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.,]/g, "").slice(0, 12);
    setAmount(cleaned);
  };

  const handleSubmit = () => {
    const parsed = parseFloat(amount.replace(",", "."));
    if (!parsed || parsed <= 0) {
      Alert.alert("Monto invalido", "Ingresa un monto mayor a 0.");
      return;
    }
    if (parsed > 99_999_999) {
      Alert.alert("Monto invalido", "El monto maximo es $99.999.999.");
      return;
    }
    onSubmit(parsed, notes);
  };

  return (
    <BottomSheet visible onClose={onClose}>
      <Text style={styles.sheetTitle}>Registrar aporte</Text>
      <Text style={styles.sheetHint}>Registra cuanto aportaste al fondo comun este mes. El monto se suma a tu contribucion del periodo actual.</Text>
      {myStatus ? (
        <Card style={styles.statusCard}>
          <CardContent>
            <Text style={styles.statusText}>
              Cuota: {formatAmount(myStatus.allocation)} · Aportado: {formatAmount(myStatus.contributed)} · Pendiente: {formatAmount(myStatus.pending)}
            </Text>
          </CardContent>
        </Card>
      ) : null}
      <Text style={styles.fieldLabel}>Monto</Text>
      <StyledTextInput
        value={amount}
        onChangeText={handleAmountChange}
        keyboardType="numeric"
        placeholder="0"
        maxLength={12}
        style={styles.amountInput}
      />
      <Text style={styles.fieldLabel}>Notas (opcional)</Text>
      <StyledTextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="ej: transferencia banco"
        style={styles.notesInput}
      />
      <Button loading={isLoading} onPress={handleSubmit} style={styles.submitButton}>
        Confirmar aporte
      </Button>
      <Button variant="ghost" onPress={onClose}>Cancelar</Button>
    </BottomSheet>
  );
}

// ── Category configuration ──────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  { value: "RENT", label: "Alquiler" },
  { value: "UTILITIES", label: "Servicios" },
  { value: "GROCERIES", label: "Supermercado" },
  { value: "HOME", label: "Hogar" },
  { value: "FOOD", label: "Comida" },
  { value: "HEALTH", label: "Salud" },
  { value: "ENTERTAINMENT", label: "Entretenimiento" },
  { value: "EDUCATION", label: "Educacion" },
  { value: "TRANSPORT", label: "Transporte" },
  { value: "OTHER", label: "Otros" },
] as const;

const DEFAULT_CATEGORIES = ["RENT", "UTILITIES", "GROCERIES", "HOME"];

// ── SetupSheet ──────────────────────────────────────────────────────────────

interface SetupSheetProps {
  onClose: () => void;
  onSubmit: (payload: CreateFundPayload) => void;
  isLoading: boolean;
}

function SetupSheet({ onClose, onSubmit, isLoading }: SetupSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: membersData } = useMembers();
  const members = membersData?.members ?? [];

  const [name, setName] = useState("Fondo Comun");
  const [target, setTarget] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  // Auto-split monthly target equally among members when target changes
  const handleTargetChange = useCallback(
    (value: string) => {
      setTarget(value);
      const parsed = parseFloat(value.replace(",", "."));
      if (!parsed || parsed <= 0 || members.length === 0) return;

      const equalShare = Math.round(parsed / members.length);
      const newAllocations: Record<string, string> = {};
      for (const member of members) {
        newAllocations[member.id] = String(equalShare);
      }
      setAllocations(newAllocations);
    },
    [members],
  );

  const toggleCategory = (categoryValue: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryValue)
        ? prev.filter((cat) => cat !== categoryValue)
        : [...prev, categoryValue],
    );
  };

  const updateMemberAllocation = (memberId: string, value: string) => {
    const cleaned = value.replace(/[^0-9.,]/g, "").slice(0, 12);
    setAllocations((prev) => ({ ...prev, [memberId]: cleaned }));
  };

  const handleSubmit = () => {
    const parsedTarget = parseFloat(target.replace(",", "."));
    if (!parsedTarget || parsedTarget <= 0) {
      Alert.alert("Objetivo invalido", "Ingresa un objetivo mensual mayor a 0.");
      return;
    }
    if (parsedTarget > 99_999_999) {
      Alert.alert("Objetivo invalido", "El monto maximo es $99.999.999.");
      return;
    }
    if (selectedCategories.length === 0) {
      Alert.alert("Sin categorias", "Selecciona al menos una categoria para el fondo.");
      return;
    }

    const memberAllocations = members
      .map((member) => ({
        memberId: member.id,
        amount: parseFloat((allocations[member.id] ?? "0").replace(",", ".")) || 0,
      }))
      .filter((allocation) => allocation.amount > 0);

    onSubmit({
      name: name || "Fondo Comun",
      monthlyTarget: parsedTarget,
      fundCategories: selectedCategories,
      allocations: memberAllocations.length > 0 ? memberAllocations : undefined,
    });
  };

  const handleTargetInput = (text: string) => {
    const cleaned = text.replace(/[^0-9.,]/g, "").slice(0, 12);
    handleTargetChange(cleaned);
  };

  return (
    <BottomSheet visible onClose={onClose}>
      <Text style={styles.sheetTitle}>Configurar fondo</Text>
      <Text style={styles.sheetHint}>El fondo comun permite compartir gastos del hogar. Defini un objetivo mensual, las categorias que cubre, y cuanto aporta cada miembro.</Text>

      {/* Fund name */}
      <Text style={styles.fieldLabel}>Nombre del fondo</Text>
      <StyledTextInput value={name} onChangeText={setName} placeholder="Fondo Comun" style={styles.notesInput} />

      {/* Monthly target */}
      <Text style={styles.fieldLabel}>Objetivo mensual ($)</Text>
      <StyledTextInput
        value={target}
        onChangeText={handleTargetInput}
        keyboardType="numeric"
        placeholder="ej: 50000"
        maxLength={12}
        style={styles.notesInput}
      />

      {/* Category multi-select */}
      <Text style={styles.fieldLabel}>Categorias del fondo</Text>
      <View style={styles.categoryGrid}>
        {EXPENSE_CATEGORIES.map((category) => {
          const isActive = selectedCategories.includes(category.value);
          return (
            <Pressable
              key={category.value}
              onPress={() => toggleCategory(category.value)}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryChipLabel, isActive && styles.categoryChipLabelActive]}>
                {category.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Member allocations */}
      {members.length > 0 ? (
        <>
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Cuota mensual por miembro</Text>
          <Text style={styles.allocationHint}>
            Se reparte equitativamente al cambiar el objetivo
          </Text>
          {members.map((member) => (
            <View key={member.id} style={styles.allocationRow}>
              <Text style={styles.allocationName} numberOfLines={1}>{member.name}</Text>
              <View style={styles.allocationInputContainer}>
                <Text style={styles.allocationCurrency}>$</Text>
                <StyledTextInput
                  value={allocations[member.id] ?? ""}
                  onChangeText={(value) => updateMemberAllocation(member.id, value)}
                  keyboardType="numeric"
                  placeholder="0"
                  style={styles.allocationInput}
                />
              </View>
            </View>
          ))}
        </>
      ) : null}

      <Button loading={isLoading} onPress={handleSubmit} style={styles.submitButton}>Crear fondo</Button>
      <Button variant="ghost" onPress={onClose}>Cancelar</Button>
    </BottomSheet>
  );
}

export default function FundScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { me, activeHouseholdId } = useMobileAuth();
  const fundQuery = useFund();
  const contributeM = useContributeToFund();
  const setupM = useSetupFund();

  const [showContribute, setShowContribute] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const myMemberId = me?.members.find((m) => m.householdId === activeHouseholdId)?.id;
  const fund = fundQuery.data ?? null;
  const myStatus = fund?.memberStatuses.find((s) => s.memberId === myMemberId);

  const handleContribute = (amount: number, notes: string) => {
    contributeM.mutate(
      { amount, notes: notes || undefined },
      {
        onSuccess: () => {
          setShowContribute(false);
          Alert.alert("Listo!", "Tu aporte quedo registrado.");
        },
        onError: (error) => {
          Alert.alert("Error", getMobileErrorMessage(error));
        },
      },
    );
  };

  const handleSetup = (payload: CreateFundPayload) => {
    setupM.mutate(payload, {
      onSuccess: () => setShowSetup(false),
      onError: (error) => Alert.alert("Error", getMobileErrorMessage(error)),
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.backRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={[typography.cardTitle, { color: colors.text }]}>Fondo Comun</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{fund?.name ?? "Fondo Comun"}</Text>
            <Text style={styles.subtitle}>
              {fund ? `Periodo ${fund.currentPeriod}` : "Sin fondo configurado"}
            </Text>
          </View>
          {!fund && !fundQuery.isLoading ? (
            <Button size="sm" onPress={() => setShowSetup(true)}>Configurar</Button>
          ) : null}
        </View>
      </View>

      <ScrollView
        bounces={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={fundQuery.isRefetching}
            onRefresh={() => void fundQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {fundQuery.isLoading ? <SkeletonCard /> : null}

        {fundQuery.isError ? (
          <Card style={styles.errorCard}>
            <CardContent><Text style={styles.errorText}>{getMobileErrorMessage(fundQuery.error)}</Text></CardContent>
          </Card>
        ) : null}

        {fund ? (
          <>
            {/* Balance card */}
            <Card style={fund.balance < 0 ? styles.negativeCard : undefined}>
              <CardContent>
                <Text style={styles.balanceLabel}>Saldo disponible</Text>
                <Text style={[styles.balanceAmount, { color: fund.balance < 0 ? colors.errorText : colors.text }]}>
                  {formatAmount(fund.balance)}
                </Text>
                {fund.monthlyTarget ? (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min((fund.contributedThisPeriod / fund.monthlyTarget) * 100, 100)}%` as `${number}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressLabel}>
                      {formatAmount(fund.contributedThisPeriod)} de {formatAmount(fund.monthlyTarget)} meta mensual
                    </Text>
                  </View>
                ) : null}
              </CardContent>
            </Card>

            {/* Period stats */}
            <View style={styles.statRow}>
              <Card style={styles.statCard}>
                <CardContent>
                  <View style={styles.statHeader}>
                    <TrendingUp size={14} color={colors.successText} />
                    <Text style={styles.statLabel}>Aportado</Text>
                  </View>
                  <Text style={[styles.statValue, { color: colors.successText }]}>{formatAmount(fund.contributedThisPeriod)}</Text>
                </CardContent>
              </Card>
              <Card style={styles.statCard}>
                <CardContent>
                  <View style={styles.statHeader}>
                    <TrendingDown size={14} color={colors.errorText} />
                    <Text style={styles.statLabel}>Gastado</Text>
                  </View>
                  <Text style={[styles.statValue, { color: colors.errorText }]}>{formatAmount(fund.spentThisPeriod)}</Text>
                </CardContent>
              </Card>
            </View>

            {/* My contribution */}
            {myStatus ? (
              <Card style={myStatus.pending > 0 ? styles.pendingCard : styles.paidCard}>
                <CardContent>
                  <View style={styles.myStatusRow}>
                    <View>
                      <Text style={styles.myStatusTitle}>Tu cuota este mes</Text>
                      <Text style={styles.myStatusSub}>
                        {formatAmount(myStatus.contributed)} de {formatAmount(myStatus.allocation)} aportados
                      </Text>
                    </View>
                    {myStatus.pending > 0 ? (
                      <Button size="sm" onPress={() => setShowContribute(true)}>
                        <Plus size={14} color="#fff" />
                        Aportar {formatAmount(myStatus.pending)}
                      </Button>
                    ) : (
                      <View style={styles.paidBadge}>
                        <Text style={styles.paidBadgeText}>Al dia</Text>
                      </View>
                    )}
                  </View>
                </CardContent>
              </Card>
            ) : null}

            {/* Member statuses */}
            {fund.memberStatuses.length > 0 ? (
              <Card>
                <CardContent>
                  <Text style={styles.sectionTitle}>Cuotas del periodo</Text>
                  {fund.memberStatuses.map((ms) => (
                    <View key={ms.memberId} style={styles.memberRow}>
                      <Text style={[styles.memberName, ms.memberId === myMemberId && styles.memberNameMe]}>
                        {ms.memberName}{ms.memberId === myMemberId ? " (vos)" : ""}
                      </Text>
                      <View style={styles.memberAmounts}>
                        <Text style={styles.memberContributed}>
                          {formatAmount(ms.contributed)} / {formatAmount(ms.allocation)}
                        </Text>
                        {ms.pending > 0 ? (
                          <Text style={styles.memberPending}>Debe {formatAmount(ms.pending)}</Text>
                        ) : null}
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
                  <Text style={styles.sectionTitle}>Gastos recientes del fondo</Text>
                  {fund.recentExpenses.map((exp) => (
                    <View key={exp.id} style={styles.txRow}>
                      <View>
                        <Text style={styles.txTitle}>{exp.title}</Text>
                        <Text style={styles.txDate}>{formatDate(exp.date)}</Text>
                      </View>
                      <Text style={styles.txNegative}>-{formatAmount(exp.amount)}</Text>
                    </View>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {/* Recent contributions */}
            {fund.recentContributions.length > 0 ? (
              <Card>
                <CardContent>
                  <Text style={styles.sectionTitle}>Aportes recientes</Text>
                  {fund.recentContributions.map((c) => (
                    <View key={c.id} style={styles.txRow}>
                      <View>
                        <Text style={styles.txTitle}>{c.memberName}</Text>
                        <Text style={styles.txDate}>{formatDate(c.createdAt)}</Text>
                      </View>
                      <Text style={styles.txPositive}>+{formatAmount(c.amount)}</Text>
                    </View>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : null}

        {!fundQuery.isLoading && !fund && !fundQuery.isError ? (
          <EmptyState
            icon={<Landmark size={32} color={colors.mutedForeground} />}
            title="Sin fondo configurado"
            subtitle="El fondo comun centraliza los gastos compartidos del hogar. Cada miembro aporta una cuota mensual y los gastos de categorias seleccionadas se descuentan automaticamente."
            actionLabel="Crear fondo"
            onAction={() => setShowSetup(true)}
          />
        ) : null}
      </ScrollView>

      {showContribute ? (
        <ContributeSheet
          myStatus={myStatus}
          onClose={() => setShowContribute(false)}
          onSubmit={handleContribute}
          isLoading={contributeM.isPending}
        />
      ) : null}

      {showSetup ? (
        <SetupSheet
          onClose={() => setShowSetup(false)}
          onSubmit={handleSetup}
          isLoading={setupM.isPending}
        />
      ) : null}
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
    backRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: "center", justifyContent: "center" },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    title: { fontFamily: fontFamily.sans, fontSize: 22, fontWeight: "700", color: c.text },
    subtitle: { fontFamily: fontFamily.sans, fontSize: 13, color: c.mutedForeground, marginTop: 2 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 24, gap: spacing.sm },
    errorCard: { backgroundColor: c.errorBg },
    errorText: { fontFamily: fontFamily.sans, color: c.errorText, fontSize: 13 },
    negativeCard: { backgroundColor: c.errorBg, borderColor: c.errorText },
    balanceLabel: { fontFamily: fontFamily.sans, fontSize: 13, color: c.mutedForeground },
    balanceAmount: { fontFamily: fontFamily.sans, fontSize: 32, fontWeight: "800", marginTop: 4 },
    progressContainer: { marginTop: spacing.sm },
    progressTrack: { height: 6, backgroundColor: c.border, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: c.primary, borderRadius: 3 },
    progressLabel: { fontFamily: fontFamily.sans, fontSize: 12, color: c.mutedForeground, marginTop: 4 },
    statRow: { flexDirection: "row", gap: spacing.sm },
    statCard: { flex: 1 },
    statHeader: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
    statLabel: { fontFamily: fontFamily.sans, fontSize: 11, color: c.mutedForeground },
    statValue: { fontFamily: fontFamily.sans, fontSize: 18, fontWeight: "700" },
    pendingCard: { backgroundColor: c.warningBg, borderColor: c.warningText },
    paidCard: { backgroundColor: c.successBg, borderColor: c.successText },
    myStatusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    myStatusTitle: { fontFamily: fontFamily.sans, fontWeight: "700", color: c.text, fontSize: 14 },
    myStatusSub: { fontFamily: fontFamily.sans, color: c.mutedForeground, fontSize: 12, marginTop: 2 },
    paidBadge: { backgroundColor: c.successBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
    paidBadgeText: { fontFamily: fontFamily.sans, color: c.successText, fontWeight: "700", fontSize: 13 },
    sectionTitle: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "700", color: c.text, marginBottom: spacing.sm },
    memberRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border },
    memberName: { fontFamily: fontFamily.sans, color: c.text, fontWeight: "500", fontSize: 14 },
    memberNameMe: { fontWeight: "700" },
    memberAmounts: { alignItems: "flex-end" },
    memberContributed: { fontFamily: fontFamily.sans, color: c.text, fontWeight: "600", fontSize: 13 },
    memberPending: { fontFamily: fontFamily.sans, color: c.errorText, fontSize: 11, marginTop: 2 },
    txRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.border },
    txTitle: { color: c.text, fontWeight: "500" },
    txDate: { fontFamily: fontFamily.sans, color: c.mutedForeground, fontSize: 12, marginTop: 2 },
    txNegative: { color: c.errorText, fontWeight: "600" },
    txPositive: { color: c.successText, fontWeight: "600" },
    sheetTitle: { fontFamily: fontFamily.sans, fontSize: 18, fontWeight: "700", color: c.text, marginBottom: spacing.xs },
    sheetHint: { fontFamily: fontFamily.sans, fontSize: 13, color: c.mutedForeground, lineHeight: 18, marginBottom: spacing.md },
    statusCard: { backgroundColor: c.successBg, marginBottom: spacing.md },
    statusText: { fontFamily: fontFamily.sans, fontSize: 13, color: c.successText },
    fieldLabel: { fontFamily: fontFamily.sans, fontSize: 13, color: c.mutedForeground, marginBottom: spacing.xs },
    amountInput: { marginBottom: spacing.md },
    notesInput: { marginBottom: spacing.md },
    submitButton: { marginBottom: spacing.sm },
    // Category chips
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    categoryChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    categoryChipActive: {
      borderColor: c.primary,
      backgroundColor: c.primaryLight,
    },
    categoryChipLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "500",
      color: c.mutedForeground,
    },
    categoryChipLabelActive: {
      fontWeight: "700",
      color: c.primary,
    },
    // Member allocations
    allocationHint: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
      marginBottom: spacing.sm,
    },
    allocationRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
      gap: spacing.md,
    },
    allocationName: {
      flex: 1,
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "500",
      color: c.text,
    },
    allocationInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    allocationCurrency: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      fontWeight: "600",
      color: c.mutedForeground,
    },
    allocationInput: {
      width: 100,
      marginBottom: 0,
    },
  });
}
