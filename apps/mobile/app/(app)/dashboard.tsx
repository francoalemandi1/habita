import { useMemo } from "react";
import { router } from "expo-router";
import { Pressable, RefreshControl, SafeAreaView, ScrollView, Text, View } from "react-native";
import { useMyAssignments } from "@/hooks/use-assignments";
import { useExpenses } from "@/hooks/use-expenses";
import { useBriefing, useStats } from "@/hooks/use-stats";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { semanticColors } from "@habita/design-tokens";

import type { AssignmentSummary } from "@habita/contracts";

function dayKey(dateValue: string | Date): string {
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isCompletedStatus(status: AssignmentSummary["status"]): boolean {
  return status === "COMPLETED" || status === "VERIFIED";
}

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

interface QuickActionProps {
  label: string;
  color: string;
  onPress: () => void;
}

function QuickAction({ label, color, onPress }: QuickActionProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: color,
        borderRadius: 12,
        padding: 14,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 56,
      }}
    >
      <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 13, textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const { me, activeHouseholdId } = useMobileAuth();
  const assignmentsQuery = useMyAssignments();
  const expensesQuery = useExpenses();
  const statsQuery = useStats();
  const briefingQuery = useBriefing();

  const activeHousehold = me?.households.find((h) => h.id === activeHouseholdId);
  const activeMembers = me?.members.filter((m) => m.householdId === activeHouseholdId) ?? [];
  const myMemberId = activeMembers[0]?.id;
  const todayKey = dayKey(new Date());

  const pendingTodayCount = useMemo(() => {
    const assignments = assignmentsQuery.data?.pending ?? [];
    return assignments.filter((a) => dayKey(a.dueDate) === todayKey).length;
  }, [assignmentsQuery.data?.pending, todayKey]);

  const overdueCount = useMemo(() => {
    const assignments = assignmentsQuery.data?.pending ?? [];
    return assignments.filter((a) => dayKey(a.dueDate) < todayKey).length;
  }, [assignmentsQuery.data?.pending, todayKey]);

  const monthlyExpense = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return (expensesQuery.data?.expenses ?? [])
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((total, e) => total + e.amount, 0);
  }, [expensesQuery.data?.expenses]);

  // Top performer this week
  const sortedStats = useMemo(
    () => [...(statsQuery.data?.memberStats ?? [])].sort((a, b) => b.weeklyTasks - a.weeklyTasks),
    [statsQuery.data],
  );
  const myStats = sortedStats.find((m) => m.id === myMemberId);
  const myRank = myStats ? sortedStats.indexOf(myStats) + 1 : null;

  const briefingLines = briefingQuery.data?.lines ?? briefingQuery.data?.summary ?? [];

  const isRefreshing =
    assignmentsQuery.isRefetching ||
    expensesQuery.isRefetching ||
    statsQuery.isRefetching ||
    briefingQuery.isRefetching;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", padding: 20 }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void assignmentsQuery.refetch();
              void expensesQuery.refetch();
              void statsQuery.refetch();
              void briefingQuery.refetch();
            }}
          />
        }
      >
        {/* Header */}
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: "#111111" }}>
            Hola{me?.name ? `, ${me.name.split(" ")[0]}` : ""}
          </Text>
          <Text style={{ color: "#6b7280", fontSize: 14 }}>
            {activeHousehold
              ? `${activeHousehold.name} · ${activeMembers.length} miembro${activeMembers.length !== 1 ? "s" : ""}`
              : "Sin hogar activo — ve a Ajustes"}
          </Text>
        </View>

        {/* Stat chips row */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          <View style={{ flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 10 }}>
            <Text style={{ color: "#6b7280", fontSize: 11 }}>Pendientes hoy</Text>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#111111", marginTop: 2 }}>
              {pendingTodayCount}
            </Text>
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: overdueCount > 0 ? "#fca5a5" : "#e5e7eb", borderRadius: 12, padding: 10 }}>
            <Text style={{ color: "#6b7280", fontSize: 11 }}>Atrasadas</Text>
            <Text style={{ fontSize: 22, fontWeight: "700", color: overdueCount > 0 ? "#b91c1c" : "#111111", marginTop: 2 }}>
              {overdueCount}
            </Text>
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 10 }}>
            <Text style={{ color: "#6b7280", fontSize: 11 }}>Mes</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#111111", marginTop: 2 }}>
              {formatAmount(monthlyExpense)}
            </Text>
          </View>
        </View>

        {/* Ranking card */}
        {sortedStats.length > 0 ? (
          <Pressable
            onPress={() => router.push("/(app)/progress")}
            style={{
              marginTop: 12,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
              padding: 14,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontWeight: "700", color: "#111111" }}>Ranking familiar</Text>
              <Text style={{ color: semanticColors.primary, fontSize: 13, fontWeight: "600" }}>
                Ver todo →
              </Text>
            </View>
            <View style={{ marginTop: 10, gap: 6 }}>
              {sortedStats.slice(0, 3).map((member, i) => {
                const isMe = member.id === myMemberId;
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <View
                    key={member.id}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ fontSize: 16, width: 28 }}>{medals[i] ?? `#${i + 1}`}</Text>
                    <Text
                      style={{
                        flex: 1,
                        color: isMe ? semanticColors.primary : "#111111",
                        fontWeight: isMe ? "700" : "500",
                        fontSize: 14,
                      }}
                    >
                      {member.name}
                      {isMe ? " (vos)" : ""}
                    </Text>
                    <Text style={{ color: "#374151", fontWeight: "600", fontSize: 14 }}>
                      {member.weeklyTasks} esta semana
                    </Text>
                  </View>
                );
              })}
            </View>
            {myRank && myRank > 3 ? (
              <Text style={{ marginTop: 8, color: "#6b7280", fontSize: 12 }}>
                Tu posición: #{myRank} · {myStats?.weeklyTasks ?? 0} tareas esta semana
              </Text>
            ) : null}
          </Pressable>
        ) : null}

        {/* Briefing */}
        {briefingLines.length > 0 ? (
          <View
            style={{
              marginTop: 12,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 4 }}>Briefing del día</Text>
            {briefingLines.map((line) => (
              <Text key={line} style={{ color: "#111111", fontSize: 14, marginTop: 2 }}>
                · {line}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Quick actions 2-column grid */}
        <View style={{ marginTop: 20, gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <QuickAction
              label="Mis tareas"
              color={semanticColors.primary}
              onPress={() => router.push("/(app)/tasks")}
            />
            <QuickAction
              label="Gastos"
              color="#111827"
              onPress={() => router.push("/(app)/expenses")}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <QuickAction
              label="Ahorra"
              color="#2563eb"
              onPress={() => router.push("/(app)/shopping-plan")}
            />
            <QuickAction
              label="Plan semanal"
              color="#4f46e5"
              onPress={() => router.push("/(app)/weekly-plan")}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <QuickAction
              label="Transferencias"
              color="#0ea5e9"
              onPress={() => router.push("/(app)/transfers")}
            />
            <QuickAction
              label="Notificaciones"
              color="#f59e0b"
              onPress={() => router.push("/(app)/notifications")}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <QuickAction
              label="Insights"
              color="#0f766e"
              onPress={() => router.push("/(app)/expense-insights")}
            />
            <QuickAction
              label="Fondo"
              color="#7c3aed"
              onPress={() => router.push("/(app)/fund")}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <QuickAction
              label="Servicios"
              color="#0369a1"
              onPress={() => router.push("/(app)/services")}
            />
            <QuickAction
              label="Descubrí"
              color="#be185d"
              onPress={() => router.push("/(app)/discover")}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <QuickAction
              label="Cociná"
              color="#ea580c"
              onPress={() => router.push("/(app)/cocina")}
            />
            <QuickAction
              label="Ajustes"
              color="#6b7280"
              onPress={() => router.push("/(app)/settings")}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
