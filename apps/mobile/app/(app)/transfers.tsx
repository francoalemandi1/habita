import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { useRespondTransfer, useTransfers } from "@/hooks/use-transfers";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { semanticColors } from "@habita/design-tokens";

export default function TransfersScreen() {
  const [type, setType] = useState<"sent" | "received" | undefined>(undefined);
  const transfersQuery = useTransfers(type);
  const respondTransfer = useRespondTransfer();

  const transfers = transfersQuery.data?.transfers ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Transferencias</Text>
      <Text style={{ marginTop: 4, color: "#6b7280" }}>Gestioná solicitudes de tareas entre miembros.</Text>

      <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
        {[
          { id: "all", label: "Todas" },
          { id: "received", label: "Recibidas" },
          { id: "sent", label: "Enviadas" },
        ].map((option) => {
          const isActive =
            (option.id === "all" && !type) ||
            (option.id === "received" && type === "received") ||
            (option.id === "sent" && type === "sent");

          return (
            <Pressable
              key={option.id}
              onPress={() => {
                if (option.id === "all") {
                  setType(undefined);
                  return;
                }
                setType(option.id as "sent" | "received");
              }}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: isActive ? semanticColors.primary : "#d1d5db",
                backgroundColor: isActive ? "#eff6ff" : "#ffffff",
                paddingHorizontal: 12,
                paddingVertical: 7,
              }}
            >
              <Text style={{ fontWeight: "700", fontSize: 12 }}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {transfersQuery.isLoading ? (
        <Text style={{ marginTop: 16, color: "#6b7280" }}>Cargando transferencias...</Text>
      ) : null}
      {transfersQuery.isError ? (
        <Text style={{ marginTop: 16, color: "#b91c1c" }}>{getMobileErrorMessage(transfersQuery.error)}</Text>
      ) : null}

      <ScrollView style={{ marginTop: 12 }}>
        {transfers.map((transfer) => (
          <View
            key={transfer.id}
            style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12, marginBottom: 10 }}
          >
            <Text style={{ fontWeight: "700" }}>{transfer.assignment.task.name}</Text>
            <Text style={{ marginTop: 4, color: "#374151" }}>
              {transfer.fromMember.name} → {transfer.toMember.name}
            </Text>
            <Text style={{ marginTop: 4, color: "#6b7280" }}>
              Estado: {transfer.status} · {new Date(transfer.requestedAt).toLocaleDateString("es-AR")}
            </Text>
            {transfer.reason ? <Text style={{ marginTop: 4, color: "#6b7280" }}>“{transfer.reason}”</Text> : null}

            {transfer.status === "PENDING" ? (
              <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() =>
                    respondTransfer.mutate({
                      transferId: transfer.id,
                      action: "ACCEPT",
                    })
                  }
                  style={{ borderRadius: 8, backgroundColor: "#dcfce7", paddingHorizontal: 10, paddingVertical: 7 }}
                >
                  <Text style={{ color: "#166534", fontWeight: "700" }}>Aceptar</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    respondTransfer.mutate({
                      transferId: transfer.id,
                      action: "REJECT",
                    })
                  }
                  style={{ borderRadius: 8, backgroundColor: "#fee2e2", paddingHorizontal: 10, paddingVertical: 7 }}
                >
                  <Text style={{ color: "#b91c1c", fontWeight: "700" }}>Rechazar</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
