import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, ArrowLeftRight } from "lucide-react-native";
import { useRespondTransfer, useTransfers } from "@/hooks/use-transfers";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { TabBar } from "@/components/ui/tab-bar";
import { colors, fontFamily, spacing, typography } from "@/theme";

export default function TransfersScreen() {
  const [type, setType] = useState<"sent" | "received" | undefined>(undefined);
  const transfersQuery = useTransfers(type);
  const respondTransfer = useRespondTransfer();
  const transfers = transfersQuery.data?.transfers ?? [];

  const tabIndex = type === undefined ? 0 : type === "received" ? 1 : 2;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.backRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={styles.backTitle}>Transferencias</Text>
          <View style={styles.backBtn} />
        </View>
        <Text style={styles.subtitle}>Gestioná solicitudes de tareas entre miembros.</Text>
      </View>
      <TabBar
        tabs={[{ label: "Todas" }, { label: "Recibidas" }, { label: "Enviadas" }]}
        activeIndex={tabIndex}
        onTabPress={(i) => setType(i === 0 ? undefined : i === 1 ? "received" : "sent")}
        style={styles.tabBar}
      />
      <ScrollView
        bounces={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={transfersQuery.isRefetching} onRefresh={() => void transfersQuery.refetch()} tintColor={colors.primary} />}
      >
        {transfersQuery.isLoading ? (
          <View style={styles.loadingList}><SkeletonCard /><SkeletonCard /></View>
        ) : transfersQuery.isError ? (
          <Card style={styles.errorCard}><CardContent><Text style={styles.errorText}>{getMobileErrorMessage(transfersQuery.error)}</Text></CardContent></Card>
        ) : transfers.length === 0 ? (
          <EmptyState icon={<ArrowLeftRight size={32} color={colors.mutedForeground} />} title="Sin transferencias" subtitle="Acá aparecerán las solicitudes de cambio de tarea" />
        ) : (
          transfers.map((transfer) => (
            <Card key={transfer.id} style={styles.transferCard}>
              <CardContent>
                <Text style={styles.transferTaskName}>{transfer.assignment.task.name}</Text>
                <Text style={styles.transferArrow}>{transfer.fromMember.name} \u2192 {transfer.toMember.name}</Text>
                <Text style={styles.transferMeta}>Estado: {transfer.status} · {new Date(transfer.requestedAt).toLocaleDateString("es-AR")}</Text>
                {transfer.reason ? <Text style={styles.transferReason}>"{transfer.reason}"</Text> : null}
                {transfer.status === "PENDING" ? (
                  <View style={styles.transferActions}>
                    <Button variant="success" size="sm" onPress={() => respondTransfer.mutate({ transferId: transfer.id, action: "ACCEPT" })}>Aceptar</Button>
                    <Button variant="destructive" size="sm" onPress={() => respondTransfer.mutate({ transferId: transfer.id, action: "REJECT" })}>Rechazar</Button>
                  </View>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
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
  tabBar: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 24, gap: spacing.sm },
  loadingList: { gap: spacing.md },
  errorCard: { backgroundColor: colors.errorBg },
  errorText: { fontFamily: fontFamily.sans, color: colors.errorText, fontSize: 14 },
  transferCard: {},
  transferTaskName: { fontFamily: fontFamily.sans, fontWeight: "700", color: colors.text, fontSize: 15, marginBottom: spacing.xs },
  transferArrow: { fontFamily: fontFamily.sans, color: colors.text, fontSize: 13, marginBottom: spacing.xs },
  transferMeta: { fontFamily: fontFamily.sans, color: colors.mutedForeground, fontSize: 12, marginBottom: spacing.xs },
  transferReason: { fontFamily: fontFamily.sans, color: colors.mutedForeground, fontSize: 12, fontStyle: "italic", marginBottom: spacing.sm },
  transferActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
});
