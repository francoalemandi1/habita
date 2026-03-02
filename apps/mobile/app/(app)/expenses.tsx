import { router } from "expo-router";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { useExpenses } from "@/hooks/use-expenses";

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export default function ExpensesScreen() {
  const { data, isLoading, isError, refetch } = useExpenses();
  const expenses = data?.expenses ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", padding: 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>Registrá</Text>
        <Pressable
          onPress={() => router.push("/(app)/new-expense")}
          style={{ backgroundColor: "#5260fe", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "600" }}>Nuevo</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <Text style={{ marginTop: 24, color: "#666666" }}>Cargando gastos...</Text>
      ) : null}

      {isError ? (
        <View style={{ marginTop: 24, gap: 8 }}>
          <Text style={{ color: "#b91c1c" }}>No se pudieron cargar los gastos.</Text>
          <Pressable onPress={() => void refetch()}>
            <Text style={{ color: "#5260fe", fontWeight: "600" }}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !isError && expenses.length === 0 ? (
        <Text style={{ marginTop: 24, color: "#666666" }}>Todavía no hay gastos cargados.</Text>
      ) : null}

      <ScrollView style={{ marginTop: 16 }}>
        {expenses.map((expense) => (
          <View
            key={expense.id}
            style={{
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontWeight: "600" }}>{expense.title}</Text>
            <Text style={{ marginTop: 2, color: "#666666", fontSize: 12 }}>
              {expense.paidBy.name} · {new Date(expense.date).toLocaleDateString("es-AR")}
            </Text>
            <Text style={{ marginTop: 8, fontWeight: "700" }}>{formatAmount(expense.amount)}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
