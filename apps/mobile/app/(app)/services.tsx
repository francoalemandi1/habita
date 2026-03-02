import { useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useServices, useGenerateServiceExpense, useDeleteService } from "@/hooks/use-services";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { semanticColors } from "@habita/design-tokens";

import type { SerializedService } from "@/hooks/use-services";

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensual",
  BIMONTHLY: "Bimestral",
  QUARTERLY: "Trimestral",
  YEARLY: "Anual",
};

function formatAmount(amount: number | null): string {
  if (amount === null) return "—";
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── Service Card ────────────────────────────────────────────────────────────

interface ServiceCardProps {
  service: SerializedService;
  onGenerate: (service: SerializedService) => void;
  onDelete: (service: SerializedService) => void;
  isGenerating: boolean;
}

function ServiceCard({ service, onGenerate, onDelete, isGenerating }: ServiceCardProps) {
  const days = daysUntil(service.nextDueDate);
  const isOverdue = days < 0;
  const isDueSoon = days >= 0 && days <= 7;

  const dueDateColor = isOverdue ? "#b91c1c" : isDueSoon ? "#d97706" : "#6b7280";

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: isOverdue ? "#fca5a5" : "#e5e7eb",
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        backgroundColor: isOverdue ? "#fff1f2" : "#fff",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "700", color: "#111", fontSize: 15 }}>{service.title}</Text>
          {service.provider && (
            <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>{service.provider}</Text>
          )}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontWeight: "700", color: "#111", fontSize: 16 }}>
            {formatAmount(service.lastAmount)}
          </Text>
          <Text style={{ color: "#6b7280", fontSize: 11 }}>
            {FREQUENCY_LABELS[service.frequency] ?? service.frequency}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <View>
          <Text style={{ fontSize: 12, color: dueDateColor, fontWeight: isOverdue || isDueSoon ? "600" : "400" }}>
            {isOverdue
              ? `Venció hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? "s" : ""}`
              : days === 0
              ? "Vence hoy"
              : `Vence ${formatDate(service.nextDueDate)}`}
          </Text>
          <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
            Paga: {service.paidBy.name}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => onGenerate(service)}
            disabled={isGenerating || !service.lastAmount}
            style={{
              backgroundColor: service.lastAmount ? semanticColors.primary : "#e5e7eb",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: service.lastAmount ? "#fff" : "#9ca3af", fontWeight: "600", fontSize: 13 }}>
              {isGenerating ? "..." : "Generar"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onDelete(service)}
            style={{
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: "#6b7280", fontSize: 13 }}>🗑</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function ServicesScreen() {
  const servicesQuery = useServices();
  const generateM = useGenerateServiceExpense();
  const deleteM = useDeleteService();
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const services = servicesQuery.data ?? [];
  const active = services.filter((s) => s.isActive);
  const inactive = services.filter((s) => !s.isActive);

  const handleGenerate = (service: SerializedService) => {
    if (!service.lastAmount) {
      Alert.alert("Sin monto", "Este servicio no tiene monto configurado. Editalo primero.");
      return;
    }
    Alert.alert(
      "Generar gasto",
      `¿Registrar ${service.title} por ${formatAmount(service.lastAmount)}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () => {
            setGeneratingId(service.id);
            generateM.mutate(service.id, {
              onSuccess: () => {
                setGeneratingId(null);
                Alert.alert("¡Listo!", "El gasto fue registrado correctamente.");
              },
              onError: (error) => {
                setGeneratingId(null);
                Alert.alert("Error", getMobileErrorMessage(error));
              },
            });
          },
        },
      ],
    );
  };

  const handleDelete = (service: SerializedService) => {
    Alert.alert(
      "Eliminar servicio",
      `¿Eliminar "${service.title}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            deleteM.mutate(service.id, {
              onError: (error) => {
                Alert.alert("Error", getMobileErrorMessage(error));
              },
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", padding: 20 }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={servicesQuery.isRefetching}
            onRefresh={() => void servicesQuery.refetch()}
          />
        }
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#111" }}>Servicios</Text>
        <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
          Suscripciones y gastos recurrentes del hogar
        </Text>

        {servicesQuery.isLoading && (
          <Text style={{ marginTop: 24, color: "#6b7280" }}>Cargando servicios...</Text>
        )}

        {servicesQuery.isError && (
          <Text style={{ marginTop: 24, color: "#b91c1c" }}>
            {getMobileErrorMessage(servicesQuery.error)}
          </Text>
        )}

        {/* Overdue / due-soon banner */}
        {(() => {
          const overdue = active.filter((s) => daysUntil(s.nextDueDate) < 0);
          if (overdue.length === 0) return null;
          return (
            <View
              style={{
                marginTop: 14,
                backgroundColor: "#fff1f2",
                borderWidth: 1,
                borderColor: "#fca5a5",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <Text style={{ color: "#b91c1c", fontWeight: "600" }}>
                {overdue.length} servicio{overdue.length !== 1 ? "s" : ""} vencido{overdue.length !== 1 ? "s" : ""}
              </Text>
              <Text style={{ color: "#b91c1c", fontSize: 12, marginTop: 2 }}>
                Generá el gasto para mantener el historial al día.
              </Text>
            </View>
          );
        })()}

        {/* Active services */}
        {active.length > 0 && (
          <View style={{ marginTop: 16 }}>
            {active.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onGenerate={handleGenerate}
                onDelete={handleDelete}
                isGenerating={generatingId === service.id}
              />
            ))}
          </View>
        )}

        {/* Inactive services */}
        {inactive.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ color: "#9ca3af", fontSize: 12, fontWeight: "600", marginBottom: 8 }}>
              INACTIVOS
            </Text>
            {inactive.map((service) => (
              <View
                key={service.id}
                style={{
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                  opacity: 0.6,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontWeight: "600", color: "#6b7280" }}>{service.title}</Text>
                  <Text style={{ color: "#9ca3af" }}>{formatAmount(service.lastAmount)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {!servicesQuery.isLoading && services.length === 0 && (
          <View style={{ marginTop: 40, alignItems: "center" }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 6 }}>
              Sin servicios configurados
            </Text>
            <Text style={{ color: "#6b7280", textAlign: "center" }}>
              Agregá servicios desde la versión web para gestionar los gastos recurrentes del hogar.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
