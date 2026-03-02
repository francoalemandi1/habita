import { Pressable, RefreshControl, SafeAreaView, ScrollView, Text, View } from "react-native";
import { usePreferences, useRemovePreference, useSetPreference } from "@/hooks/use-preferences";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { semanticColors } from "@habita/design-tokens";

import type { MemberPreference, PreferenceValue } from "@/hooks/use-preferences";

const FREQ_LABELS: Record<string, string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  ONCE: "Una vez",
};

// ── Task preference row ─────────────────────────────────────────────────────

interface TaskRowProps {
  pref: MemberPreference;
  onSet: (taskId: string, value: PreferenceValue) => void;
  onRemove: (taskId: string) => void;
  isLoading: boolean;
}

function TaskRow({ pref, onSet, onRemove, isLoading }: TaskRowProps) {
  const isPreferred = pref.preference === "PREFERRED";
  const isDisliked = pref.preference === "DISLIKED";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
        gap: 10,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "600", color: "#111", fontSize: 14 }}>{pref.task.name}</Text>
        <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 1 }}>
          {FREQ_LABELS[pref.task.frequency] ?? pref.task.frequency} · Peso {pref.task.weight}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 6 }}>
        {/* Like */}
        <Pressable
          onPress={() =>
            isPreferred ? onRemove(pref.taskId) : onSet(pref.taskId, "PREFERRED")
          }
          disabled={isLoading}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isPreferred ? "#dcfce7" : "#f3f4f6",
            borderWidth: isPreferred ? 1.5 : 0,
            borderColor: isPreferred ? "#16a34a" : "transparent",
          }}
        >
          <Text style={{ fontSize: 16 }}>👍</Text>
        </Pressable>

        {/* Dislike */}
        <Pressable
          onPress={() =>
            isDisliked ? onRemove(pref.taskId) : onSet(pref.taskId, "DISLIKED")
          }
          disabled={isLoading}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDisliked ? "#fee2e2" : "#f3f4f6",
            borderWidth: isDisliked ? 1.5 : 0,
            borderColor: isDisliked ? "#b91c1c" : "transparent",
          }}
        >
          <Text style={{ fontSize: 16 }}>👎</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function PreferencesScreen() {
  const prefsQuery = usePreferences();
  const setM = useSetPreference();
  const removeM = useRemovePreference();

  const isLoading = setM.isPending || removeM.isPending;

  const handleSet = (taskId: string, preference: PreferenceValue) => {
    setM.mutate({ taskId, preference });
  };

  const handleRemove = (taskId: string) => {
    removeM.mutate(taskId);
  };

  const preferred = prefsQuery.data?.preferred ?? [];
  const disliked = prefsQuery.data?.disliked ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", padding: 20 }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={prefsQuery.isRefetching}
            onRefresh={() => void prefsQuery.refetch()}
          />
        }
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#111" }}>
          Mis preferencias
        </Text>
        <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
          Indicá qué tareas te gustan o evitás. El algoritmo de asignación las toma en cuenta.
        </Text>

        {prefsQuery.isLoading && (
          <Text style={{ marginTop: 24, color: "#6b7280" }}>Cargando preferencias...</Text>
        )}

        {prefsQuery.isError && (
          <Text style={{ marginTop: 24, color: "#b91c1c" }}>
            {getMobileErrorMessage(prefsQuery.error)}
          </Text>
        )}

        {/* Stats */}
        {prefsQuery.data && (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: "#f0fdf4",
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: "#bbf7d0",
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#16a34a" }}>
                {prefsQuery.data.stats.preferredCount}
              </Text>
              <Text style={{ color: "#166534", fontSize: 12 }}>👍 Me gustan</Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "#fff1f2",
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: "#fecaca",
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#b91c1c" }}>
                {prefsQuery.data.stats.dislikedCount}
              </Text>
              <Text style={{ color: "#991b1b", fontSize: 12 }}>👎 Prefiero evitar</Text>
            </View>
          </View>
        )}

        {/* Preferred section */}
        {preferred.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontWeight: "700", color: "#16a34a", marginBottom: 4 }}>
              👍 Me gustan ({preferred.length})
            </Text>
            {preferred.map((pref) => (
              <TaskRow
                key={pref.id}
                pref={pref}
                onSet={handleSet}
                onRemove={handleRemove}
                isLoading={isLoading}
              />
            ))}
          </View>
        )}

        {/* Disliked section */}
        {disliked.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontWeight: "700", color: "#b91c1c", marginBottom: 4 }}>
              👎 Prefiero evitar ({disliked.length})
            </Text>
            {disliked.map((pref) => (
              <TaskRow
                key={pref.id}
                pref={pref}
                onSet={handleSet}
                onRemove={handleRemove}
                isLoading={isLoading}
              />
            ))}
          </View>
        )}

        {!prefsQuery.isLoading && preferred.length === 0 && disliked.length === 0 && !prefsQuery.isError && (
          <View style={{ marginTop: 40, alignItems: "center" }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>🎯</Text>
            <Text style={{ fontWeight: "700", color: "#111", marginBottom: 6 }}>
              Sin preferencias configuradas
            </Text>
            <Text style={{ color: "#6b7280", textAlign: "center" }}>
              Las preferencias aparecen acá cuando marcás tareas desde la sección Tareas.{"\n"}
              El 👍/👎 está disponible en el detalle de cada tarea.
            </Text>
          </View>
        )}

        {/* Hint */}
        {!prefsQuery.isLoading && (preferred.length > 0 || disliked.length > 0) && (
          <View
            style={{
              marginTop: 20,
              backgroundColor: "#eff6ff",
              borderRadius: 10,
              padding: 12,
              borderLeftWidth: 3,
              borderLeftColor: semanticColors.primary,
            }}
          >
            <Text style={{ fontSize: 12, color: "#1d4ed8" }}>
              💡 Tocá 👍 o 👎 para cambiar o eliminar una preferencia.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
