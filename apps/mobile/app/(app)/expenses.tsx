import { useState } from "react";
import { router } from "expo-router";
import { Alert, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { useDeleteExpense, useExpenses, useUpdateExpense } from "@/hooks/use-expenses";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { semanticColors } from "@habita/design-tokens";

import type { SerializedExpense } from "@habita/contracts";

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

interface ExpenseCardProps {
  expense: SerializedExpense;
  onSave: (expenseId: string, input: { title: string; amount: number }) => Promise<void>;
  onDelete: (expenseId: string) => Promise<void>;
  isSaving: boolean;
  isDeleting: boolean;
}

function ExpenseCard({ expense, onSave, onDelete, isSaving, isDeleting }: ExpenseCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(expense.title);
  const [editAmount, setEditAmount] = useState(String(expense.amount));

  const submitEdit = async () => {
    const parsedAmount = Number(editAmount.replace(",", "."));
    if (!editTitle.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }
    try {
      await onSave(expense.id, { title: editTitle.trim(), amount: parsedAmount });
      setIsEditing(false);
    } catch {
      // error is surfaced by parent screen
    }
  };

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
      }}
    >
      {isEditing ? (
        <View style={{ gap: 8 }}>
          <TextInput
            value={editTitle}
            onChangeText={setEditTitle}
            style={{ borderWidth: 1, borderColor: "#dddddd", borderRadius: 10, padding: 10 }}
          />
          <TextInput
            value={editAmount}
            onChangeText={setEditAmount}
            keyboardType="decimal-pad"
            style={{ borderWidth: 1, borderColor: "#dddddd", borderRadius: 10, padding: 10 }}
          />
        </View>
      ) : (
        <>
          <Text style={{ fontWeight: "600" }}>{expense.title}</Text>
          <Text style={{ marginTop: 2, color: "#666666", fontSize: 12 }}>
            {expense.paidBy.name} · {new Date(expense.date).toLocaleDateString("es-AR")}
          </Text>
          <Text style={{ marginTop: 8, fontWeight: "700" }}>{formatAmount(expense.amount)}</Text>
        </>
      )}

      <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
        {isEditing ? (
          <>
            <Pressable
              onPress={() => {
                setEditTitle(expense.title);
                setEditAmount(String(expense.amount));
                setIsEditing(false);
              }}
              style={{ backgroundColor: "#f3f4f6", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}
              disabled={isSaving}
            >
              <Text style={{ fontWeight: "600" }}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={() => void submitEdit()}
              style={{
                backgroundColor: semanticColors.primary,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
                opacity: isSaving ? 0.7 : 1,
              }}
              disabled={isSaving}
            >
              <Text style={{ color: "#ffffff", fontWeight: "700" }}>{isSaving ? "Guardando..." : "Guardar"}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => setIsEditing(true)}
              style={{ backgroundColor: "#f3f4f6", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}
            >
              <Text style={{ fontWeight: "600" }}>Editar</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                Alert.alert("Eliminar gasto", "¿Querés eliminar este gasto?", [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: () => {
                      void onDelete(expense.id);
                    },
                  },
                ])
              }
              style={{
                backgroundColor: "#fee2e2",
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
                opacity: isDeleting ? 0.7 : 1,
              }}
              disabled={isDeleting}
            >
              <Text style={{ color: "#b91c1c", fontWeight: "700" }}>
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

export default function ExpensesScreen() {
  const { data, isLoading, isError, error, refetch } = useExpenses();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const expenses = data?.expenses ?? [];
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSave = async (expenseId: string, input: { title: string; amount: number }) => {
    setActionError(null);
    try {
      await updateExpense.mutateAsync({
        expenseId,
        payload: {
          title: input.title,
          amount: input.amount,
        },
      });
    } catch (error) {
      setActionError(getMobileErrorMessage(error));
      throw error;
    }
  };

  const handleDelete = async (expenseId: string) => {
    setActionError(null);
    try {
      await deleteExpense.mutateAsync(expenseId);
    } catch (error) {
      setActionError(getMobileErrorMessage(error));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", padding: 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>Registrá</Text>
        <Pressable
          onPress={() => router.push("/(app)/new-expense")}
          style={{ backgroundColor: semanticColors.primary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "600" }}>Nuevo</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <Text style={{ marginTop: 24, color: "#666666" }}>Cargando gastos...</Text>
      ) : null}

      {isError ? (
        <View style={{ marginTop: 24, gap: 8 }}>
          <Text style={{ color: "#b91c1c" }}>{getMobileErrorMessage(error)}</Text>
          <Pressable onPress={() => void refetch()}>
            <Text style={{ color: semanticColors.primary, fontWeight: "600" }}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !isError && expenses.length === 0 ? (
        <Text style={{ marginTop: 24, color: "#666666" }}>Todavía no hay gastos cargados.</Text>
      ) : null}

      {actionError ? <Text style={{ marginTop: 12, color: "#b91c1c" }}>{actionError}</Text> : null}

      <ScrollView style={{ marginTop: 16 }}>
        {expenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            onSave={handleSave}
            onDelete={handleDelete}
            isSaving={updateExpense.isPending}
            isDeleting={deleteExpense.isPending}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
