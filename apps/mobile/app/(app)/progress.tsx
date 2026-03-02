import { RefreshControl, SafeAreaView, ScrollView, Text, View } from "react-native";
import { useStats } from "@/hooks/use-stats";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { semanticColors } from "@habita/design-tokens";

import type { StatsResponse } from "@habita/contracts";

const MEMBER_TYPE_LABELS: Record<string, string> = {
  ADULT: "Adulto",
  TEEN: "Adolescente",
  CHILD: "Niño/a",
};

function MedalEmoji(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <View
      style={{
        height: 6,
        backgroundColor: "#e5e7eb",
        borderRadius: 3,
        marginTop: 4,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${pct}%`,
          height: "100%",
          backgroundColor: semanticColors.primary,
          borderRadius: 3,
        }}
      />
    </View>
  );
}

interface MemberCardProps {
  member: StatsResponse["memberStats"][number];
  rank: number;
  maxWeekly: number;
  maxMonthly: number;
  isMe: boolean;
}

function MemberCard({ member, rank, maxWeekly, maxMonthly, isMe }: MemberCardProps) {
  return (
    <View
      style={{
        borderWidth: isMe ? 2 : 1,
        borderColor: isMe ? semanticColors.primary : "#e5e7eb",
        borderRadius: 12,
        padding: 14,
        backgroundColor: isMe ? "#eff6ff" : "#ffffff",
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontSize: 20 }}>{MedalEmoji(rank)}</Text>
          <View>
            <Text style={{ fontWeight: "700", color: "#111111", fontSize: 15 }}>
              {member.name}
              {isMe ? "  (vos)" : ""}
            </Text>
            <Text style={{ color: "#9ca3af", fontSize: 12 }}>
              {MEMBER_TYPE_LABELS[member.memberType] ?? member.memberType}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#111111" }}>
          {member.weeklyTasks}
        </Text>
      </View>

      <View style={{ marginTop: 10, gap: 6 }}>
        <View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, color: "#6b7280" }}>Esta semana</Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#111111" }}>
              {member.weeklyTasks}
            </Text>
          </View>
          <MiniBar value={member.weeklyTasks} max={maxWeekly} />
        </View>

        <View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, color: "#6b7280" }}>Este mes</Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#111111" }}>
              {member.monthlyTasks}
            </Text>
          </View>
          <MiniBar value={member.monthlyTasks} max={maxMonthly} />
        </View>

        <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
          Total histórico: {member.totalTasks} tareas
        </Text>
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const statsQuery = useStats();
  const { me, activeHouseholdId } = useMobileAuth();

  const myMemberId = me?.members.find((m) => m.householdId === activeHouseholdId)?.id;

  const sorted = [...(statsQuery.data?.memberStats ?? [])].sort(
    (a, b) => b.weeklyTasks - a.weeklyTasks,
  );

  const maxWeekly = sorted[0]?.weeklyTasks ?? 1;
  const maxMonthly = Math.max(...sorted.map((m) => m.monthlyTasks), 1);

  const totals = statsQuery.data?.totals;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", padding: 20 }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={statsQuery.isRefetching}
            onRefresh={() => void statsQuery.refetch()}
          />
        }
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#111111" }}>Progreso familiar</Text>
        <Text style={{ marginTop: 4, color: "#6b7280" }}>
          Ranking semanal del hogar.
        </Text>

        {statsQuery.isLoading ? (
          <Text style={{ marginTop: 24, color: "#6b7280" }}>Cargando estadísticas...</Text>
        ) : null}

        {statsQuery.isError ? (
          <Text style={{ marginTop: 24, color: "#b91c1c" }}>
            {getMobileErrorMessage(statsQuery.error)}
          </Text>
        ) : null}

        {totals ? (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 8 }}>
            <View
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 10,
                padding: 10,
              }}
            >
              <Text style={{ color: "#6b7280", fontSize: 12 }}>Completadas</Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#111111" }}>
                {totals.completed}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 10,
                padding: 10,
              }}
            >
              <Text style={{ color: "#6b7280", fontSize: 12 }}>Pendientes</Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#f59e0b" }}>
                {totals.pending}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 10,
                padding: 10,
              }}
            >
              <Text style={{ color: "#6b7280", fontSize: 12 }}>Miembros</Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#111111" }}>
                {totals.members}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: 8 }}>
          {sorted.map((member, index) => (
            <MemberCard
              key={member.id}
              member={member}
              rank={index + 1}
              maxWeekly={maxWeekly}
              maxMonthly={maxMonthly}
              isMe={member.id === myMemberId}
            />
          ))}
        </View>

        {!statsQuery.isLoading && sorted.length === 0 ? (
          <Text style={{ marginTop: 24, color: "#6b7280" }}>
            Aún no hay estadísticas para este hogar.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
