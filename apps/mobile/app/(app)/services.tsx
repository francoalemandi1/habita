import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AlertCircle, ArrowLeft, Layers, Trash2, Zap } from "lucide-react-native";
import { useServices, useGenerateServiceExpense, useDeleteService } from "@/hooks/use-services";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { colors, fontFamily, spacing, typography } from "@/theme";

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

  const dueDateColor = isOverdue ? colors.errorText : isDueSoon ? colors.warningText : colors.mutedForeground;
  const dueDateWeight = isOverdue || isDueSoon ? "600" : "400";

  return (
    <Card style={isOverdue ? styles.overdueCard : undefined}>
      <CardContent>
        <View style={styles.serviceTopRow}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            {service.provider ? (
              <Text style={styles.serviceProvider}>{service.provider}</Text>
            ) : null}
          </View>
          <View style={styles.serviceAmountCol}>
            <Text style={styles.serviceAmount}>{formatAmount(service.lastAmount)}</Text>
            <Text style={styles.serviceFrequency}>
              {FREQUENCY_LABELS[service.frequency] ?? service.frequency}
            </Text>
          </View>
        </View>

        <View style={styles.serviceBottomRow}>
          <View>
            <Text style={[styles.serviceDueDate, { color: dueDateColor, fontWeight: dueDateWeight }]}>
              {isOverdue
                ? `Venció hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? "s" : ""}`
                : days === 0
                ? "Vence hoy"
                : `Vence ${formatDate(service.nextDueDate)}`}
            </Text>
            <Text style={styles.servicePaidBy}>Paga: {service.paidBy.name}</Text>
          </View>
          <View style={styles.serviceActions}>
            <Button
              variant="default"
              size="sm"
              loading={isGenerating}
              disabled={!service.lastAmount || isGenerating}
              onPress={() => onGenerate(service)}
            >
              <Zap size={14} color="#fff" />
              Generar
            </Button>
            <Button variant="outline" size="sm" onPress={() => onDelete(service)}>
              <Trash2 size={14} color={colors.mutedForeground} />
            </Button>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

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
      Alert.alert("Sin monto", "Este servicio no tiene monto configurado. Editálo primero.");
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
              onError: (error) => Alert.alert("Error", getMobileErrorMessage(error)),
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.backRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={styles.backTitle}>Servicios</Text>
          <View style={styles.backBtn} />
        </View>
        <Text style={styles.subtitle}>Suscripciones y gastos recurrentes del hogar</Text>
      </View>

      <ScrollView
        bounces={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={servicesQuery.isRefetching}
            onRefresh={() => void servicesQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {servicesQuery.isLoading ? (
          <View style={styles.loadingList}><SkeletonCard /><SkeletonCard /></View>
        ) : servicesQuery.isError ? (
          <Card style={styles.errorCard}>
            <CardContent><Text style={styles.errorText}>{getMobileErrorMessage(servicesQuery.error)}</Text></CardContent>
          </Card>
        ) : null}

        {/* Overdue banner */}
        {(() => {
          const overdue = active.filter((s) => daysUntil(s.nextDueDate) < 0);
          if (overdue.length === 0) return null;
          return (
            <Card style={styles.overdueBanner}>
              <CardContent>
                <View style={styles.overdueBannerRow}>
                  <AlertCircle size={16} color={colors.errorText} />
                  <View>
                    <Text style={styles.overdueBannerTitle}>
                      {overdue.length} servicio{overdue.length !== 1 ? "s" : ""} vencido{overdue.length !== 1 ? "s" : ""}
                    </Text>
                    <Text style={styles.overdueBannerSub}>
                      Generá el gasto para mantener el historial al día.
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          );
        })()}

        {active.length > 0 ? (
          active.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onGenerate={handleGenerate}
              onDelete={handleDelete}
              isGenerating={generatingId === service.id}
            />
          ))
        ) : null}

        {inactive.length > 0 ? (
          <View style={styles.inactiveSection}>
            <Badge style={styles.inactiveBadge}>INACTIVOS</Badge>
            {inactive.map((service) => (
              <Card key={service.id} style={styles.inactiveCard}>
                <CardContent>
                  <View style={styles.inactiveRow}>
                    <Text style={styles.inactiveTitle}>{service.title}</Text>
                    <Text style={styles.inactiveAmount}>{formatAmount(service.lastAmount)}</Text>
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        ) : null}

        {!servicesQuery.isLoading && services.length === 0 && !servicesQuery.isError ? (
          <EmptyState
            icon={<Layers size={32} color={colors.mutedForeground} />}
            title="Sin servicios configurados"
            subtitle="Agregá servicios desde la versión web para gestionar los gastos recurrentes del hogar."
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  backRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  backTitle: { ...typography.cardTitle },
  subtitle: { fontFamily: fontFamily.sans, fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 24, gap: spacing.sm },
  loadingList: { gap: spacing.md },
  errorCard: { backgroundColor: colors.errorBg },
  errorText: { fontFamily: fontFamily.sans, color: colors.errorText, fontSize: 13 },
  overdueCard: { backgroundColor: colors.destructiveForeground, borderColor: colors.destructive },
  overdueBanner: { backgroundColor: colors.destructiveForeground, borderColor: colors.destructive },
  overdueBannerRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  overdueBannerTitle: { fontFamily: fontFamily.sans, color: colors.errorText, fontWeight: "700", fontSize: 13 },
  overdueBannerSub: { fontFamily: fontFamily.sans, color: colors.errorText, fontSize: 12, marginTop: 2 },
  serviceTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm },
  serviceInfo: { flex: 1 },
  serviceTitle: { fontFamily: fontFamily.sans, fontWeight: "700", color: colors.text, fontSize: 15 },
  serviceProvider: { fontFamily: fontFamily.sans, color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  serviceAmountCol: { alignItems: "flex-end" },
  serviceAmount: { fontFamily: fontFamily.sans, fontWeight: "700", color: colors.text, fontSize: 16 },
  serviceFrequency: { fontFamily: fontFamily.sans, color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  serviceBottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  serviceDueDate: { fontFamily: fontFamily.sans, fontSize: 12 },
  servicePaidBy: { fontFamily: fontFamily.sans, fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  serviceActions: { flexDirection: "row", gap: spacing.xs },
  inactiveSection: { gap: spacing.xs },
  inactiveBadge: { alignSelf: "flex-start" },
  inactiveCard: { opacity: 0.6 },
  inactiveRow: { flexDirection: "row", justifyContent: "space-between" },
  inactiveTitle: { fontWeight: "600", color: colors.mutedForeground },
  inactiveAmount: { color: colors.mutedForeground },
});
