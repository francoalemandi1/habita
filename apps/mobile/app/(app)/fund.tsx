import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFund, useContributeToFund, useSetupFund } from "@/hooks/use-fund";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useMembers } from "@/hooks/use-members";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { semanticColors } from "@habita/design-tokens";

import type { MemberContributionStatus } from "@/hooks/use-fund";

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

// ── Contribute Modal ────────────────────────────────────────────────────────

interface ContributeModalProps {
  visible: boolean;
  myStatus: MemberContributionStatus | undefined;
  onClose: () => void;
  onSubmit: (amount: number, notes: string) => void;
  isLoading: boolean;
}

function ContributeModal({ visible, myStatus, onClose, onSubmit, isLoading }: ContributeModalProps) {
  const [amount, setAmount] = useState(String(myStatus?.pending ?? ""));
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    const parsed = parseFloat(amount.replace(",", "."));
    if (!parsed || parsed <= 0) {
      Alert.alert("Monto inválido", "Ingresá un monto mayor a 0.");
      return;
    }
    onSubmit(parsed, notes);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 16 }}>
            Registrar aporte
          </Text>

          {myStatus && (
            <View style={{ backgroundColor: "#f0fdf4", borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 13, color: "#166534" }}>
                Cuota: {formatAmount(myStatus.allocation)} · Aportado: {formatAmount(myStatus.contributed)} · Pendiente: {formatAmount(myStatus.pending)}
              </Text>
            </View>
          )}

          <Text style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Monto</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 10,
              padding: 12,
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 14,
            }}
          />

          <Text style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Notas (opcional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="ej: transferencia banco"
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 10,
              padding: 12,
              marginBottom: 20,
            }}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            style={{
              backgroundColor: semanticColors.primary,
              borderRadius: 12,
              padding: 14,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              {isLoading ? "Registrando..." : "Confirmar aporte"}
            </Text>
          </Pressable>

          <Pressable onPress={onClose} style={{ alignItems: "center", padding: 10 }}>
            <Text style={{ color: "#6b7280" }}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Setup Modal ─────────────────────────────────────────────────────────────

interface SetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, target: number) => void;
  isLoading: boolean;
}

function SetupModal({ visible, onClose, onSubmit, isLoading }: SetupModalProps) {
  const [name, setName] = useState("Fondo Común");
  const [target, setTarget] = useState("");

  const handleSubmit = () => {
    const parsed = parseFloat(target.replace(",", "."));
    if (!parsed || parsed <= 0) {
      Alert.alert("Objetivo inválido", "Ingresá un objetivo mensual mayor a 0.");
      return;
    }
    onSubmit(name || "Fondo Común", parsed);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 16 }}>
            Configurar fondo
          </Text>

          <Text style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Nombre del fondo</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Fondo Común"
            style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 12, marginBottom: 14 }}
          />

          <Text style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Objetivo mensual ($)</Text>
          <TextInput
            value={target}
            onChangeText={setTarget}
            keyboardType="numeric"
            placeholder="ej: 50000"
            style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, padding: 12, marginBottom: 20 }}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            style={{ backgroundColor: semanticColors.primary, borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              {isLoading ? "Creando..." : "Crear fondo"}
            </Text>
          </Pressable>

          <Pressable onPress={onClose} style={{ alignItems: "center", padding: 10 }}>
            <Text style={{ color: "#6b7280" }}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function FundScreen() {
  const { me, activeHouseholdId } = useMobileAuth();
  const fundQuery = useFund();
  const contributeM = useContributeToFund();
  const setupM = useSetupFund();
  const membersQuery = useMembers();

  const [showContribute, setShowContribute] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const myMemberId = me?.members.find((m) => m.householdId === activeHouseholdId)?.id;
  const fund = fundQuery.data ?? null;

  const myStatus = fund?.memberStatuses.find((s) => s.memberId === myMemberId);

  const handleContribute = (amount: number, notes: string) => {
    contributeM.mutate(
      { amount, notes: notes || undefined },
      {
        onSuccess: () => {
          setShowContribute(false);
          Alert.alert("¡Listo!", "Tu aporte quedó registrado.");
        },
        onError: (error) => {
          Alert.alert("Error", getMobileErrorMessage(error));
        },
      },
    );
  };

  const handleSetup = (name: string, monthlyTarget: number) => {
    setupM.mutate(
      { name, monthlyTarget },
      {
        onSuccess: () => {
          setShowSetup(false);
        },
        onError: (error) => {
          Alert.alert("Error", getMobileErrorMessage(error));
        },
      },
    );
  };

  const balanceColor = fund && fund.balance < 0 ? "#b91c1c" : "#111111";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", padding: 20 }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={fundQuery.isRefetching}
            onRefresh={() => void fundQuery.refetch()}
          />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#111" }}>
              {fund?.name ?? "Fondo Común"}
            </Text>
            <Text style={{ color: "#6b7280", fontSize: 13 }}>
              {fund ? `Período ${fund.currentPeriod}` : "Sin fondo configurado"}
            </Text>
          </View>
          {!fund && (
            <Pressable
              onPress={() => setShowSetup(true)}
              style={{ backgroundColor: semanticColors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>Configurar</Text>
            </Pressable>
          )}
        </View>

        {fundQuery.isLoading && (
          <Text style={{ marginTop: 24, color: "#6b7280" }}>Cargando fondo...</Text>
        )}

        {fundQuery.isError && (
          <Text style={{ marginTop: 24, color: "#b91c1c" }}>
            {getMobileErrorMessage(fundQuery.error)}
          </Text>
        )}

        {fund && (
          <>
            {/* Balance card */}
            <View
              style={{
                marginTop: 16,
                borderWidth: 1,
                borderColor: fund.balance < 0 ? "#fca5a5" : "#e5e7eb",
                borderRadius: 14,
                padding: 18,
                backgroundColor: fund.balance < 0 ? "#fff1f2" : "#f9fafb",
              }}
            >
              <Text style={{ color: "#6b7280", fontSize: 13 }}>Saldo disponible</Text>
              <Text style={{ fontSize: 32, fontWeight: "800", color: balanceColor, marginTop: 4 }}>
                {formatAmount(fund.balance)}
              </Text>
              {fund.monthlyTarget && (
                <View style={{ marginTop: 8 }}>
                  <View style={{ height: 6, backgroundColor: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                    <View
                      style={{
                        width: `${Math.min((fund.contributedThisPeriod / fund.monthlyTarget) * 100, 100)}%`,
                        height: "100%",
                        backgroundColor: semanticColors.primary,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                  <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                    {formatAmount(fund.contributedThisPeriod)} de {formatAmount(fund.monthlyTarget)} meta mensual
                  </Text>
                </View>
              )}
            </View>

            {/* This period stats */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <View style={{ flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#6b7280", fontSize: 11 }}>Aportado este mes</Text>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#16a34a", marginTop: 2 }}>
                  {formatAmount(fund.contributedThisPeriod)}
                </Text>
              </View>
              <View style={{ flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12 }}>
                <Text style={{ color: "#6b7280", fontSize: 11 }}>Gastado este mes</Text>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#b91c1c", marginTop: 2 }}>
                  {formatAmount(fund.spentThisPeriod)}
                </Text>
              </View>
            </View>

            {/* My contribution + CTA */}
            {myStatus && (
              <View
                style={{
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: myStatus.pending > 0 ? "#fde68a" : "#bbf7d0",
                  borderRadius: 14,
                  padding: 16,
                  backgroundColor: myStatus.pending > 0 ? "#fefce8" : "#f0fdf4",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ fontWeight: "700", color: "#111", fontSize: 14 }}>Tu cuota este mes</Text>
                    <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                      {formatAmount(myStatus.contributed)} de {formatAmount(myStatus.allocation)} aportados
                    </Text>
                  </View>
                  {myStatus.pending > 0 ? (
                    <Pressable
                      onPress={() => setShowContribute(true)}
                      style={{ backgroundColor: semanticColors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
                        Aportar {formatAmount(myStatus.pending)}
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={{ backgroundColor: "#dcfce7", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
                      <Text style={{ color: "#16a34a", fontWeight: "700", fontSize: 13 }}>✓ Al día</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Member statuses */}
            {fund.memberStatuses.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontWeight: "700", color: "#111", marginBottom: 8 }}>Cuotas del período</Text>
                {fund.memberStatuses.map((ms) => (
                  <View
                    key={ms.memberId}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: "#f3f4f6",
                    }}
                  >
                    <Text style={{ color: "#111", fontWeight: ms.memberId === myMemberId ? "700" : "500" }}>
                      {ms.memberName}
                      {ms.memberId === myMemberId ? " (vos)" : ""}
                    </Text>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: "#111", fontWeight: "600", fontSize: 13 }}>
                        {formatAmount(ms.contributed)} / {formatAmount(ms.allocation)}
                      </Text>
                      {ms.pending > 0 && (
                        <Text style={{ color: "#b91c1c", fontSize: 11 }}>
                          Debe {formatAmount(ms.pending)}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Recent expenses */}
            {fund.recentExpenses.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <Text style={{ fontWeight: "700", color: "#111", marginBottom: 8 }}>Gastos recientes del fondo</Text>
                {fund.recentExpenses.map((exp) => (
                  <View
                    key={exp.id}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: "#f3f4f6",
                    }}
                  >
                    <View>
                      <Text style={{ color: "#111", fontWeight: "500" }}>{exp.title}</Text>
                      <Text style={{ color: "#9ca3af", fontSize: 12 }}>{formatDate(exp.date)}</Text>
                    </View>
                    <Text style={{ color: "#b91c1c", fontWeight: "600" }}>
                      -{formatAmount(exp.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recent contributions */}
            {fund.recentContributions.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <Text style={{ fontWeight: "700", color: "#111", marginBottom: 8 }}>Aportes recientes</Text>
                {fund.recentContributions.map((c) => (
                  <View
                    key={c.id}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: "#f3f4f6",
                    }}
                  >
                    <View>
                      <Text style={{ color: "#111", fontWeight: "500" }}>{c.memberName}</Text>
                      <Text style={{ color: "#9ca3af", fontSize: 12 }}>{formatDate(c.createdAt)}</Text>
                    </View>
                    <Text style={{ color: "#16a34a", fontWeight: "600" }}>
                      +{formatAmount(c.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {!fundQuery.isLoading && !fund && !fundQuery.isError && (
          <View style={{ marginTop: 40, alignItems: "center" }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🏦</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 6 }}>
              Sin fondo configurado
            </Text>
            <Text style={{ color: "#6b7280", textAlign: "center", marginBottom: 20 }}>
              Un fondo común permite que el hogar comparta gastos de forma transparente.
            </Text>
            <Pressable
              onPress={() => setShowSetup(true)}
              style={{
                backgroundColor: semanticColors.primary,
                borderRadius: 12,
                paddingHorizontal: 24,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Crear fondo</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <ContributeModal
        visible={showContribute}
        myStatus={myStatus}
        onClose={() => setShowContribute(false)}
        onSubmit={handleContribute}
        isLoading={contributeM.isPending}
      />

      <SetupModal
        visible={showSetup}
        onClose={() => setShowSetup(false)}
        onSubmit={handleSetup}
        isLoading={setupM.isPending}
      />
    </SafeAreaView>
  );
}
