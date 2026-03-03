import { useMemo, useState, useCallback } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, DollarSign } from "lucide-react-native";
import { useCreateExpense } from "@/hooks/use-expenses";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { Button } from "@/components/ui/button";
import { StyledTextInput } from "@/components/ui/text-input";
import { colors, fontFamily, radius, spacing, typography } from "@/theme";
import type { ExpenseCategory } from "@habita/contracts";

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
  { value: "GROCERIES", label: "Supermercado", emoji: "🛒" },
  { value: "FOOD", label: "Comida", emoji: "🍔" },
  { value: "RENT", label: "Alquiler", emoji: "🏠" },
  { value: "UTILITIES", label: "Servicios", emoji: "⚡" },
  { value: "TRANSPORT", label: "Transporte", emoji: "🚗" },
  { value: "HEALTH", label: "Salud", emoji: "❤️" },
  { value: "HOME", label: "Hogar", emoji: "🔧" },
  { value: "ENTERTAINMENT", label: "Entrete.", emoji: "🎬" },
  { value: "EDUCATION", label: "Educación", emoji: "📚" },
  { value: "OTHER", label: "Otros", emoji: "📦" },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NewExpenseScreen() {
  const { me, activeHouseholdId } = useMobileAuth();
  const createExpense = useCreateExpense();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("OTHER");
  const [categoryAutoSet, setCategoryAutoSet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payerId = useMemo(
    () => me?.members.find((m) => m.householdId === activeHouseholdId)?.id ?? me?.members[0]?.id ?? "",
    [me, activeHouseholdId],
  );

  const handleTitleChange = useCallback((text: string) => {
    setTitle(text);
    const inferred = inferCategory(text);
    if (inferred) {
      setCategory(inferred);
      setCategoryAutoSet(true);
    } else if (categoryAutoSet) {
      setCategory("OTHER");
      setCategoryAutoSet(false);
    }
  }, [categoryAutoSet]);

  const handleCategorySelect = useCallback((cat: ExpenseCategory) => {
    setCategory(cat);
    setCategoryAutoSet(false);
  }, []);

  const handleSubmit = async () => {
    setError(null);
    const parsedAmount = Number(amount.replace(",", "."));
    if (!title.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0 || !payerId) {
      setError("Completá título, monto válido y sesión con miembro activo.");
      return;
    }
    try {
      await createExpense.mutateAsync({ title: title.trim(), amount: parsedAmount, category, paidById: payerId, splitType: "EQUAL" });
      router.back();
    } catch (submitError) {
      setError(getMobileErrorMessage(submitError));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header with back button */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Nuevo gasto</Text>
        <View style={styles.backBtn} />
      </View>

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
          <Text style={styles.catLabel}>Categoría</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map((cat) => {
              const isActive = category === cat.value;
              return (
                <Pressable
                  key={cat.value}
                  onPress={() => handleCategorySelect(cat.value)}
                  style={[styles.catChip, isActive && styles.catChipActive]}
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.catText, isActive && styles.catTextActive]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...typography.cardTitle,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 24,
  },
  fieldGap: {
    marginTop: spacing.lg,
  },
  catLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  catChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  catEmoji: {
    fontSize: 14,
  },
  catText: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.text,
  },
  catTextActive: {
    fontWeight: "700",
    color: colors.primary,
  },
  errorBanner: {
    backgroundColor: colors.errorBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  errorText: {
    fontFamily: fontFamily.sans,
    color: colors.errorText,
    fontSize: 14,
  },
  submitBtn: {
    marginTop: spacing.xl,
  },
});
