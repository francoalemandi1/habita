import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { useCreateExpense } from "@/hooks/use-expenses";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { semanticColors } from "@habita/design-tokens";

import type { ExpenseCategory } from "@habita/contracts";

// ── Category config (mirrors web CATEGORY_LABELS) ──────────────────────────

const CATEGORIES: Array<{ value: ExpenseCategory; label: string; emoji: string }> = [
  { value: "GROCERIES", label: "Supermercado", emoji: "🛒" },
  { value: "FOOD",      label: "Comida",        emoji: "🍔" },
  { value: "RENT",      label: "Alquiler",       emoji: "🏠" },
  { value: "UTILITIES", label: "Servicios",      emoji: "⚡" },
  { value: "TRANSPORT", label: "Transporte",     emoji: "🚗" },
  { value: "HEALTH",    label: "Salud",          emoji: "❤️" },
  { value: "HOME",      label: "Hogar",          emoji: "🔧" },
  { value: "ENTERTAINMENT", label: "Entrete.",   emoji: "🎬" },
  { value: "EDUCATION", label: "Educación",      emoji: "📚" },
  { value: "OTHER",     label: "Otros",          emoji: "📦" },
];

// ── Screen ──────────────────────────────────────────────────────────────────

export default function NewExpenseScreen() {
  const { me, activeHouseholdId } = useMobileAuth();
  const createExpense = useCreateExpense();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("OTHER");
  const [error, setError] = useState<string | null>(null);

  // Pick the member belonging to the active household
  const payerId = useMemo(
    () => me?.members.find((m) => m.householdId === activeHouseholdId)?.id ?? me?.members[0]?.id ?? "",
    [me, activeHouseholdId],
  );

  const handleSubmit = async () => {
    setError(null);
    const parsedAmount = Number(amount.replace(",", "."));
    if (!title.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0 || !payerId) {
      setError("Completá título, monto válido y sesión con miembro activo.");
      return;
    }

    try {
      await createExpense.mutateAsync({
        title: title.trim(),
        amount: parsedAmount,
        category,
        paidById: payerId,
        splitType: "EQUAL",
      });
      router.back();
    } catch (submitError) {
      setError(getMobileErrorMessage(submitError));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", padding: 20 }}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 16 }}>
          Nuevo gasto
        </Text>

        {/* Title */}
        <Text style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Descripción</Text>
        <TextInput
          placeholder="ej: Supermercado Coto, Factura de luz..."
          value={title}
          onChangeText={setTitle}
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 10,
            padding: 12,
            fontSize: 15,
            marginBottom: 14,
          }}
        />

        {/* Amount */}
        <Text style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Monto ($)</Text>
        <TextInput
          placeholder="0"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 10,
            padding: 12,
            fontSize: 22,
            fontWeight: "700",
            marginBottom: 18,
          }}
        />

        {/* Category selector */}
        <Text style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>Categoría</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.value}
              onPress={() => setCategory(cat.value)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: category === cat.value ? semanticColors.primary : "#e5e7eb",
                backgroundColor: category === cat.value ? "#eff6ff" : "#fff",
              }}
            >
              <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: category === cat.value ? "700" : "400",
                  color: category === cat.value ? semanticColors.primary : "#374151",
                }}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? (
          <Text style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</Text>
        ) : null}

        <Pressable
          onPress={() => void handleSubmit()}
          disabled={createExpense.isPending}
          style={{
            backgroundColor: semanticColors.primary,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            opacity: createExpense.isPending ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
            {createExpense.isPending ? "Guardando..." : "Guardar gasto"}
          </Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
