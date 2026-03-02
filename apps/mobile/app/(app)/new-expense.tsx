import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import { useCreateExpense } from "@/hooks/use-expenses";
import { useMobileAuth } from "@/providers/mobile-auth-provider";

import type { ExpenseCategory } from "@habita/contracts";

const DEFAULT_CATEGORY: ExpenseCategory = "OTHER";

export default function NewExpenseScreen() {
  const { me } = useMobileAuth();
  const createExpense = useCreateExpense();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const payerId = useMemo(() => me?.members[0]?.id ?? "", [me]);

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
        category: DEFAULT_CATEGORY,
        paidById: payerId,
        splitType: "EQUAL",
      });
      router.back();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear el gasto");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", padding: 20 }}>
      <View style={{ gap: 10 }}>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>Nuevo gasto</Text>
        <TextInput
          placeholder="Título"
          value={title}
          onChangeText={setTitle}
          style={{ borderWidth: 1, borderColor: "#dddddd", borderRadius: 10, padding: 12 }}
        />
        <TextInput
          placeholder="Monto"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          style={{ borderWidth: 1, borderColor: "#dddddd", borderRadius: 10, padding: 12 }}
        />
        {error ? <Text style={{ color: "#b91c1c" }}>{error}</Text> : null}
        <Pressable
          onPress={() => void handleSubmit()}
          style={{
            backgroundColor: "#5260fe",
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
            opacity: createExpense.isPending ? 0.7 : 1,
          }}
          disabled={createExpense.isPending}
        >
          <Text style={{ color: "#ffffff", fontWeight: "600" }}>
            {createExpense.isPending ? "Guardando..." : "Guardar gasto"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
