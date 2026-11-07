import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Receipt } from "lucide-react-native";
import { Banner, Button, EmptyState, ScreenHeader, Skeleton } from "@/components/ds";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useMembers } from "@/hooks/use-members";
import { useServices } from "@/hooks/use-services";
import { useThemeColors } from "@/hooks/use-theme";
import { spacing } from "@/theme";
import { getDismissedDetectedServices } from "@/lib/plata-detected-dismiss-store";
import { detectedServiceKey } from "@/lib/plata-servicios-logic";
import { GmailCard } from "@/components/features/plata/servicios/gmail-card";
import { DetectedInvoiceCard } from "@/components/features/plata/servicios/detected-invoice-card";
import { ServiceList } from "@/components/features/plata/servicios/service-list";
import { ServiceFormSheet } from "@/components/features/plata/servicios/service-form-sheet";

import type { ThemeColors } from "@/theme";
import type { GmailScanResult, SerializedService } from "@/hooks/use-services";

/** §5.3 "Plata" — Servicios: Gmail status, detected invoices, service list + create/edit Sheet. */
export default function ServiciosScreen(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { me, activeHouseholdId } = useMobileAuth();
  const membersQuery = useMembers();
  const members = useMemo(() => membersQuery.data?.members.map((m) => ({ id: m.id, name: m.name })) ?? [], [membersQuery.data]);
  const myMember = useMemo(
    () => me?.members.find((member) => member.householdId === activeHouseholdId) ?? null,
    [me, activeHouseholdId],
  );
  const currentMemberId = myMember?.id ?? "";

  const servicesQuery = useServices();
  const [scanResult, setScanResult] = useState<GmailScanResult | null>(null);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<SerializedService | undefined>();

  useEffect(() => {
    void getDismissedDetectedServices().then(setDismissedKeys);
  }, []);

  const detectedVisible = (scanResult?.detected ?? []).filter((d) => !dismissedKeys.has(detectedServiceKey(d)));
  const services = servicesQuery.data ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader
        variant="detail"
        title="Servicios"
        backLabel="Plata"
        onBack={() => router.back()}
        action={
          <Pressable accessibilityRole="button" accessibilityLabel="Nuevo servicio" hitSlop={8} onPress={() => setShowCreate(true)}>
            <Plus size={22} strokeWidth={1.75} color={colors.monte} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={servicesQuery.isRefetching} onRefresh={() => void servicesQuery.refetch()} tintColor={colors.monte} />}
      >
        <GmailCard onScanned={setScanResult} />

        {detectedVisible.map((service) => (
          <DetectedInvoiceCard
            key={detectedServiceKey(service)}
            service={service}
            onDismiss={(key) => setDismissedKeys((prev) => new Set(prev).add(key))}
          />
        ))}

        {servicesQuery.isLoading ? (
          <View style={styles.loadingList}>
            <Skeleton height={64} />
            <Skeleton height={64} />
          </View>
        ) : servicesQuery.isError ? (
          <View style={styles.errorBlock}>
            <Banner tone="attention" text="No pudimos cargar los servicios." />
            <Button label="Reintentar" variant="link" onPress={() => void servicesQuery.refetch()} />
          </View>
        ) : services.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Sin servicios"
            description="Agregá servicios recurrentes como luz, gas o internet para llevar un control de vencimientos."
            actionLabel="Agregar servicio"
            onAction={() => setShowCreate(true)}
          />
        ) : (
          <ServiceList services={services} onSelect={setEditing} />
        )}
      </ScrollView>

      <ServiceFormSheet visible={showCreate} onClose={() => setShowCreate(false)} members={members} currentMemberId={currentMemberId} />
      {editing && (
        <ServiceFormSheet
          visible={!!editing}
          onClose={() => setEditing(undefined)}
          members={members}
          currentMemberId={currentMemberId}
          existing={editing}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.paper },
    scrollContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
    loadingList: { gap: spacing.md },
    errorBlock: { gap: spacing.xs },
  });
}
