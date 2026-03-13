import { useMemo, useState, useCallback } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, ChevronDown, DollarSign, Wallet } from "lucide-react-native";
import { useCreateExpense } from "@/hooks/use-expenses";
import { useFund } from "@/hooks/use-fund";
import { useMembers } from "@/hooks/use-members";
import { useMilestone } from "@/hooks/use-milestone";
import { useCelebration } from "@/hooks/use-celebration";
import { usePushOptIn } from "@/hooks/use-push-opt-in";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useThemeColors } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { StyledTextInput } from "@/components/ui/text-input";
import { SecondaryHeader } from "@/components/ui/secondary-header";
import { fontFamily, radius, spacing } from "@/theme";

import { inferExpenseSubcategory } from "@habita/domain";

import type { ThemeColors } from "@/theme";
import type { ExpenseCategory, SplitType } from "@habita/contracts";
import type { ExpenseSubcategory } from "@habita/domain";

const SUBCATEGORY_LABELS: Record<ExpenseSubcategory, string> = {
  GENERAL: "General",
  SUPERMARKET: "Supermercado",
  KIOSCO: "Kiosco",
  DELIVERY: "Delivery",
  RESTAURANT: "Restaurante",
  STREAMING: "Streaming",
  PHARMACY: "Farmacia",
  FUEL: "Combustible",
  TRANSPORT_APP: "App de transporte",
};

// ─── Category inference (mirrors web's inferCategory) ────────────────────────

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

const CATEGORY_KEYWORDS: Array<{ category: ExpenseCategory; keywords: string[] }> = [
  {
    category: "GROCERIES",
    keywords: [
      "supermercado", "super", "coto", "carrefour", "jumbo", "dia", "disco",
      "changomas", "vea", "walmart", "chino", "almacen", "verduleria",
      "fiambreria", "carniceria", "despensa", "kiosco", "maxikiosco",
      "minimarket", "autoservicio", "dietetica", "mercado", "mayorista",
      "diarco", "makro", "vital", "granja", "huevos", "frutas", "verduras",
      "compras", "mandado", "mandados", "leche", "pan", "yerba",
    ],
  },
  {
    category: "UTILITIES",
    keywords: [
      "luz", "gas", "agua", "internet", "wifi", "telefono", "celular",
      "cable", "electricidad", "edenor", "edesur", "metrogas", "telecom",
      "personal", "claro", "movistar", "fibertel", "servicio", "servicios",
      "expensas", "monotributo", "impuesto", "seguro", "prepaga",
      "icloud", "google one", "apple", "microsoft",
    ],
  },
  { category: "RENT", keywords: ["alquiler", "renta", "inmobiliaria"] },
  {
    category: "FOOD",
    keywords: [
      "restaurante", "restaurant", "comida", "delivery", "rappi", "pedidosya",
      "pedidos ya", "mcdonalds", "burger", "pizza", "sushi", "cafe",
      "bar", "cerveceria", "heladeria", "panaderia", "rotiseria",
      "empanadas", "asado", "starbucks", "havanna", "mostaza",
    ],
  },
  {
    category: "TRANSPORT",
    keywords: [
      "uber", "cabify", "taxi", "remis", "nafta", "combustible", "peaje",
      "estacionamiento", "sube", "colectivo", "tren", "subte", "ypf",
      "shell", "axion", "vuelo", "avion", "hotel", "booking", "viaje",
    ],
  },
  {
    category: "HEALTH",
    keywords: [
      "farmacia", "medico", "doctor", "hospital", "clinica", "salud",
      "remedio", "medicamento", "obra social", "dentista", "oculista",
      "farmacity", "psicologo", "terapia", "veterinaria",
    ],
  },
  {
    category: "ENTERTAINMENT",
    keywords: [
      "cine", "teatro", "recital", "show", "entrada", "netflix", "spotify",
      "disney", "hbo", "streaming", "gym", "gimnasio", "ropa", "zapatillas",
      "shopping", "regalo", "juguete",
    ],
  },
  {
    category: "EDUCATION",
    keywords: [
      "colegio", "escuela", "universidad", "facultad", "curso", "clase",
      "cuota", "libro", "libreria", "udemy", "coursera", "platzi",
    ],
  },
  {
    category: "HOME",
    keywords: [
      "ferreteria", "pintura", "plomero", "electricista", "limpieza",
      "mueble", "muebles", "arreglo", "decoracion", "easy", "sodimac",
      "computadora", "notebook",
    ],
  },
];

function inferCategory(title: string): ExpenseCategory | null {
  const normalized = normalizeText(title);
  if (normalized.length < 2) return null;

  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    for (const keyword of keywords) {
      const normalizedKw = normalizeText(keyword);
      if (normalizedKw.length <= 3) {
        const wordBoundary = new RegExp(`\\b${normalizedKw}\\b`);
        if (wordBoundary.test(normalized)) return category;
      } else {
        if (normalized.includes(normalizedKw)) return category;
      }
    }
  }
  return null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES: Array<{ value: ExpenseCategory; label: string; emoji: string }> = [
  { value: "GROCERIES", label: "Supermercado", emoji: "\uD83D\uDED2" },
  { value: "FOOD", label: "Comida", emoji: "\uD83C\uDF54" },
  { value: "UTILITIES", label: "Servicios", emoji: "\u26A1" },
  { value: "TRANSPORT", label: "Transporte", emoji: "\uD83D\uDE97" },
  { value: "HEALTH", label: "Salud", emoji: "\u2764\uFE0F" },
  { value: "HOME", label: "Hogar", emoji: "\uD83D\uDD27" },
  // secondary (shown when expanded)
  { value: "RENT", label: "Alquiler", emoji: "\uD83C\uDFE0" },
  { value: "ENTERTAINMENT", label: "Entretenimiento", emoji: "\uD83C\uDFAC" },
  { value: "EDUCATION", label: "Educación", emoji: "\uD83D\uDCDA" },
  { value: "OTHER", label: "Otros", emoji: "\uD83D\uDCE6" },
];

const PRIMARY_CATEGORY_COUNT = 6;

const SPLIT_OPTIONS: Array<{ value: SplitType; label: string; icon: string }> = [
  { value: "EQUAL", label: "Partes iguales", icon: "\u00F7" },
  { value: "CUSTOM", label: "Montos custom", icon: "#" },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NewExpenseScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { me, activeHouseholdId } = useMobileAuth();
  const expenseMilestone = useMilestone("first-expense");
  const { celebrate } = useCelebration();
  const { trackAction } = usePushOptIn();
  const createExpense = useCreateExpense();
  const { data: membersData } = useMembers();
  const { data: fund } = useFund();
  const members = membersData?.members ?? [];

  const params = useLocalSearchParams<{ prefillTitle?: string; prefillAmount?: string; prefillCategory?: string; prefillNotes?: string }>();

  const initialCategory = (params.prefillCategory as ExpenseCategory | undefined) ??
    (params.prefillTitle ? (inferCategory(params.prefillTitle) ?? "OTHER") : "OTHER");

  const [title, setTitle] = useState(params.prefillTitle ?? "");
  const [amount, setAmount] = useState(params.prefillAmount ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(initialCategory);
  const [categoryAutoSet, setCategoryAutoSet] = useState(
    !!(params.prefillCategory ?? (params.prefillTitle && inferCategory(params.prefillTitle)))
  );
  const [splitType, setSplitType] = useState<SplitType>("EQUAL");
  const [paidById, setPaidById] = useState<string | null>(null);
  const [showPayerSelect, setShowPayerSelect] = useState(false);
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [chargeToFund, setChargeToFund] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [notes, setNotes] = useState(params.prefillNotes ?? "");
  const [showNotes, setShowNotes] = useState(!!params.prefillNotes);
  const [error, setError] = useState<string | null>(null);

  const activeFund = fund?.isActive ? fund : null;
  const isFundCategory = activeFund
    ? (activeFund.fundCategories as string[]).includes(category)
    : false;

  const myMemberId = useMemo(
    () => me?.members.find((m) => m.householdId === activeHouseholdId)?.id ?? me?.members[0]?.id ?? "",
    [me, activeHouseholdId],
  );

  const inferredSubcategory = inferExpenseSubcategory(title, category);

  const effectivePaidById = paidById ?? myMemberId;
  const selectedPayer = members.find((m) => m.id === effectivePaidById);
  const isSolo = members.length <= 1;

  const handleTitleChange = useCallback((text: string) => {
    setTitle(text);
    const inferred = inferCategory(text);
    if (inferred) {
      setCategory(inferred);
      setCategoryAutoSet(true);
      const idx = CATEGORIES.findIndex((c) => c.value === inferred);
      if (idx >= PRIMARY_CATEGORY_COUNT) setShowAllCategories(true);
      if (activeFund && (activeFund.fundCategories as string[]).includes(inferred)) {
        setChargeToFund(true);
      }
    } else if (categoryAutoSet) {
      setCategory("OTHER");
      setCategoryAutoSet(false);
    }
  }, [categoryAutoSet, activeFund]);

  const handleCategorySelect = useCallback((cat: ExpenseCategory) => {
    setCategory(cat);
    setCategoryAutoSet(false);
    // Auto-expand if a secondary category is selected (e.g. via prefill)
    const idx = CATEGORIES.findIndex((c) => c.value === cat);
    if (idx >= PRIMARY_CATEGORY_COUNT) setShowAllCategories(true);
  }, []);

  const handleSubmit = async () => {
    setError(null);
    const parsedAmount = Number(amount.replace(",", "."));
    if (!title.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Completa titulo y monto valido.");
      return;
    }
    if (!effectivePaidById) {
      setError("No hay miembro activo en este hogar.");
      return;
    }

    // Validate custom splits sum
    if (splitType === "CUSTOM" && members.length > 1) {
      const assignedTotal = members.reduce(
        (sum, m) => sum + (parseFloat(customSplits[m.id] ?? "0") || 0),
        0,
      );
      if (Math.abs(parsedAmount - assignedTotal) > 0.01) {
        setError("Los montos custom no suman el total del gasto.");
        return;
      }
    }

    const splits =
      splitType === "CUSTOM" && members.length > 1
        ? members.map((m) => ({
            memberId: m.id,
            amount: parseFloat(customSplits[m.id] ?? "0") || 0,
          }))
        : undefined;

    try {
      await createExpense.mutateAsync({
        title: title.trim(),
        amount: parsedAmount,
        category,
        paidById: effectivePaidById,
        splitType,
        splits,
        notes: notes.trim() || undefined,
        chargeToFund: chargeToFund && isFundCategory ? true : undefined,
      });
      const wasFirst = await expenseMilestone.complete();
      if (wasFirst) celebrate("first-expense");
      void trackAction();
      router.back();
    } catch (submitError) {
      setError(getMobileErrorMessage(submitError));
    }
  };

  // Auto-distribute helper for custom splits
  const handleDistributeEqually = useCallback(() => {
    const parsedAmount = Number(amount.replace(",", "."));
    if (!parsedAmount || parsedAmount <= 0 || members.length === 0) return;
    const perMember = Math.round((parsedAmount / members.length) * 100) / 100;
    const newSplits: Record<string, string> = {};
    for (const m of members) {
      newSplits[m.id] = perMember.toFixed(2);
    }
    setCustomSplits(newSplits);
  }, [amount, members]);

  // Custom split validation
  const customSplitTotal = useMemo(() => {
    if (splitType !== "CUSTOM") return 0;
    return members.reduce(
      (sum, m) => sum + (parseFloat(customSplits[m.id] ?? "0") || 0),
      0,
    );
  }, [splitType, customSplits, members]);

  const parsedAmount = Number(amount.replace(",", ".")) || 0;
  const splitDifference = parsedAmount - customSplitTotal;
  const isSplitBalanced = Math.abs(splitDifference) < 0.01;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header with back button */}
      <SecondaryHeader title="Nuevo gasto" />

      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Description */}
        <StyledTextInput
          label="Descripción"
          placeholder="ej: Supermercado Coto..."
          value={title}
          onChangeText={handleTitleChange}
          autoFocus
        />
        {title.length > 0 && inferredSubcategory !== "GENERAL" && (
          <View style={styles.subcategoryBadge}>
            <Text style={styles.subcategoryBadgeText}>
              {SUBCATEGORY_LABELS[inferredSubcategory]}
            </Text>
          </View>
        )}

        {/* Amount */}
        <View style={styles.fieldGap}>
          <StyledTextInput
            label="Monto"
            placeholder="0"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            leftIcon={<DollarSign size={16} color={colors.mutedForeground} />}
          />
        </View>

        {/* Category chips */}
        <View style={styles.fieldGap}>
          <Text style={styles.sectionLabel}>Categoría</Text>
          <View style={styles.chipGrid}>
            {CATEGORIES.slice(0, showAllCategories ? CATEGORIES.length : PRIMARY_CATEGORY_COUNT).map((cat) => {
              const isActive = category === cat.value;
              return (
                <Pressable
                  key={cat.value}
                  onPress={() => handleCategorySelect(cat.value)}
                  style={[styles.chip, isActive && styles.chipActive]}
                >
                  <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setShowAllCategories(!showAllCategories)}
              style={styles.chip}
            >
              <Text style={styles.chipEmoji}>{showAllCategories ? "▲" : "▼"}</Text>
              <Text style={styles.chipText}>
                {showAllCategories ? "Menos" : "Más"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Payer select (only for multi-member households) */}
        {!isSolo && (
          <View style={styles.fieldGap}>
            <Text style={styles.sectionLabel}>Quien pago</Text>
            <Pressable
              onPress={() => setShowPayerSelect(!showPayerSelect)}
              style={styles.selectButton}
            >
              <Text style={styles.selectButtonText}>
                {effectivePaidById === myMemberId
                  ? "Vos pagaste"
                  : selectedPayer?.name ?? "Seleccionar"}
              </Text>
              <ChevronDown size={16} color={colors.mutedForeground} />
            </Pressable>

            {showPayerSelect && (
              <View style={styles.selectDropdown}>
                {members.map((m) => {
                  const isSelected = m.id === effectivePaidById;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => {
                        setPaidById(m.id);
                        setShowPayerSelect(false);
                      }}
                      style={[styles.selectOption, isSelected && styles.selectOptionActive]}
                    >
                      <Text style={[styles.selectOptionText, isSelected && styles.selectOptionTextActive]}>
                        {m.name}{m.id === myMemberId ? " (vos)" : ""}
                      </Text>
                      {isSelected && <Check size={14} color={colors.primary} />}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Split type (only for multi-member households) */}
        {!isSolo && (
          <View style={styles.fieldGap}>
            <Text style={styles.sectionLabel}>Como se divide</Text>
            {chargeToFund ? (
              <View style={styles.splitDisabledHint}>
                <Text style={styles.splitDisabledHintText}>
                  Los gastos del fondo común no se dividen entre miembros
                </Text>
              </View>
            ) : (
              <View style={styles.splitRow}>
                {SPLIT_OPTIONS.map((opt) => {
                  const isActive = splitType === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setSplitType(opt.value)}
                      style={[styles.chip, isActive && styles.chipActive, styles.splitChip]}
                    >
                      <Text style={[styles.chipText, { fontWeight: "700" }]}>{opt.icon}</Text>
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Custom split amounts */}
        {!isSolo && !chargeToFund && splitType === "CUSTOM" && (
          <View style={styles.fieldGap}>
            <View style={styles.customSplitHeader}>
              <Text style={styles.sectionLabel}>Monto por miembro</Text>
              <Pressable onPress={handleDistributeEqually}>
                <Text style={styles.distributeLink}>Dividir equitativo</Text>
              </Pressable>
            </View>
            {members.map((m) => (
              <View key={m.id} style={styles.customSplitRow}>
                <Text style={styles.customSplitName} numberOfLines={1}>{m.name}</Text>
                <StyledTextInput
                  value={customSplits[m.id] ?? ""}
                  onChangeText={(v) => setCustomSplits((prev) => ({ ...prev, [m.id]: v }))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  style={styles.customSplitInput}
                />
              </View>
            ))}
            {/* Split validation indicator */}
            {parsedAmount > 0 && (
              <View style={[
                styles.splitValidation,
                isSplitBalanced ? styles.splitValidationOk : splitDifference > 0 ? styles.splitValidationWarn : styles.splitValidationError,
              ]}>
                <Text style={[
                  styles.splitValidationText,
                  isSplitBalanced ? styles.splitValidationTextOk : splitDifference > 0 ? styles.splitValidationTextWarn : styles.splitValidationTextError,
                ]}>
                  {isSplitBalanced
                    ? "Montos correctos"
                    : splitDifference > 0
                      ? `$${splitDifference.toFixed(2)} por asignar`
                      : `$${Math.abs(splitDifference).toFixed(2)} de mas`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Charge to fund toggle */}
        {activeFund && isFundCategory && (
          <View style={styles.fieldGap}>
            <Pressable
              onPress={() => setChargeToFund(!chargeToFund)}
              style={[styles.fundToggle, chargeToFund && styles.fundToggleActive]}
            >
              <Wallet size={16} color={chargeToFund ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.fundToggleText, chargeToFund && styles.fundToggleTextActive]}>
                Cargar al fondo común
              </Text>
              <View style={[styles.fundToggleCheck, chargeToFund && styles.fundToggleCheckActive]}>
                {chargeToFund && <Check size={10} color={colors.white} strokeWidth={3} />}
              </View>
            </Pressable>
          </View>
        )}

        {/* Notes toggle */}
        <View style={styles.fieldGap}>
          <Pressable onPress={() => setShowNotes(!showNotes)} style={styles.notesToggle}>
            <ChevronDown
              size={14}
              color={colors.mutedForeground}
              style={showNotes ? { transform: [{ rotate: "180deg" }] } : undefined}
            />
            <Text style={styles.notesToggleText}>Notas</Text>
          </Pressable>
          {showNotes && (
            <StyledTextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Detalle adicional..."
              multiline
              numberOfLines={2}
              maxLength={500}
              style={styles.notesInput}
            />
          )}
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <Button onPress={() => void handleSubmit()} loading={createExpense.isPending} style={styles.submitBtn}>
          Guardar gasto
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 24,
    },
    fieldGap: {
      marginTop: spacing.lg,
    },
    sectionLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "600",
      color: c.text,
      marginBottom: spacing.sm,
    },
    chipGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    chipActive: {
      borderColor: c.primary,
      backgroundColor: c.primaryLight,
    },
    chipEmoji: {
      fontSize: 14,
    },
    chipText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      color: c.text,
    },
    chipTextActive: {
      fontWeight: "700",
      color: c.primary,
    },
    // Payer select
    selectButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    selectButtonText: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.text,
    },
    selectDropdown: {
      marginTop: spacing.xs,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      overflow: "hidden",
    },
    selectOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    selectOptionActive: {
      backgroundColor: c.primaryLight,
    },
    selectOptionText: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.text,
    },
    selectOptionTextActive: {
      fontWeight: "700",
      color: c.primary,
    },
    // Split
    splitRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    splitChip: {
      flex: 1,
      justifyContent: "center",
    },
    // Custom splits
    customSplitHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    distributeLink: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.primary,
      fontWeight: "600",
    },
    customSplitRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
      gap: spacing.md,
    },
    customSplitName: {
      flex: 1,
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.text,
    },
    customSplitInput: {
      width: 110,
      marginBottom: 0,
    },
    splitValidation: {
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    splitValidationOk: {
      backgroundColor: c.successBg,
    },
    splitValidationWarn: {
      backgroundColor: c.warningBg,
    },
    splitValidationError: {
      backgroundColor: c.errorBg,
    },
    splitValidationText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
    },
    splitValidationTextOk: {
      color: c.successText,
    },
    splitValidationTextWarn: {
      color: c.warningText,
    },
    splitValidationTextError: {
      color: c.errorText,
    },
    // Notes
    notesToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    notesToggleText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      color: c.mutedForeground,
    },
    notesInput: {
      marginTop: spacing.sm,
    },
    // Error & submit
    errorBanner: {
      backgroundColor: c.errorBg,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
    errorText: {
      fontFamily: fontFamily.sans,
      color: c.errorText,
      fontSize: 14,
    },
    submitBtn: {
      marginTop: spacing.xl,
    },
    subcategoryBadge: {
      alignSelf: "flex-start" as const,
      marginTop: 6,
      backgroundColor: c.primaryLight,
      borderRadius: radius.full,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    subcategoryBadgeText: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "600" as const,
      color: c.primary,
    },
    splitDisabledHint: {
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      backgroundColor: c.muted,
    },
    splitDisabledHintText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      color: c.mutedForeground,
    },
    // Fund toggle
    fundToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: radius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      backgroundColor: c.card,
    },
    fundToggleActive: {
      borderColor: `${c.primary}50`,
      backgroundColor: `${c.primary}08`,
    },
    fundToggleText: {
      flex: 1,
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.mutedForeground,
    },
    fundToggleTextActive: {
      color: c.primary,
    },
    fundToggleCheck: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: c.mutedForeground,
      alignItems: "center",
      justifyContent: "center",
    },
    fundToggleCheckActive: {
      borderColor: c.primary,
      backgroundColor: c.primary,
    },
  });
}
