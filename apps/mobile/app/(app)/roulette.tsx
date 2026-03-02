import { useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { useRouletteAssign } from "@/hooks/use-roulette";
import { useMembers } from "@/hooks/use-members";
import { useTasks } from "@/hooks/use-task-management";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { semanticColors } from "@habita/design-tokens";

import type { RouletteAssignResult } from "@/hooks/use-roulette";

// ── Result card ─────────────────────────────────────────────────────────────

function ResultCard({ result }: { result: RouletteAssignResult }) {
  return (
    <View
      style={{
        marginTop: 20,
        borderWidth: 2,
        borderColor: semanticColors.primary,
        borderRadius: 16,
        padding: 20,
        backgroundColor: "#eff6ff",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 40, marginBottom: 8 }}>🎰</Text>
      <Text style={{ fontSize: 18, fontWeight: "800", color: "#111", textAlign: "center" }}>
        {result.taskName}
      </Text>
      <Text style={{ color: "#6b7280", marginTop: 4 }}>
        asignado a {result.assignment.member.name}
      </Text>
      <View
        style={{
          marginTop: 12,
          backgroundColor: "#dcfce7",
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 6,
        }}
      >
        <Text style={{ color: "#16a34a", fontWeight: "700" }}>✓ Tarea asignada para hoy</Text>
      </View>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function RouletteScreen() {
  const { me, activeHouseholdId } = useMobileAuth();
  const membersQuery = useMembers();
  const tasksQuery = useTasks();
  const assignM = useRouletteAssign();

  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [customTask, setCustomTask] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [result, setResult] = useState<RouletteAssignResult | null>(null);

  const members = (membersQuery.data?.members ?? []).filter((m) => m.isActive);
  const myMemberId = me?.members.find((m) => m.householdId === activeHouseholdId)?.id;

  const allTasks = tasksQuery.data?.tasks ?? [];

  const handleSpin = () => {
    if (!selectedMemberId) {
      Alert.alert("Falta miembro", "Seleccioná a quién asignarle la tarea.");
      return;
    }
    if (!useCustom && !selectedTaskId) {
      Alert.alert("Falta tarea", "Elegí una tarea del catálogo o escribí una personalizada.");
      return;
    }
    if (useCustom && !customTask.trim()) {
      Alert.alert("Tarea vacía", "Escribí el nombre de la tarea personalizada.");
      return;
    }

    assignM.mutate(
      {
        memberId: selectedMemberId,
        ...(useCustom
          ? { customTaskName: customTask.trim() }
          : { taskId: selectedTaskId }),
      },
      {
        onSuccess: (data) => setResult(data),
        onError: (err) => Alert.alert("Error", getMobileErrorMessage(err)),
      },
    );
  };

  const handleReset = () => {
    setResult(null);
    setSelectedMemberId("");
    setSelectedTaskId("");
    setCustomTask("");
    setUseCustom(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", padding: 20 }}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#111" }}>Ruleta de tareas</Text>
        <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
          Asigná una tarea de forma rápida, sin debates.
        </Text>

        {/* Member selector */}
        <Text style={{ fontWeight: "600", color: "#111", marginTop: 20, marginBottom: 8 }}>
          ¿A quién?
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {members.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => setSelectedMemberId(m.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: selectedMemberId === m.id ? semanticColors.primary : "#e5e7eb",
                backgroundColor: selectedMemberId === m.id ? "#eff6ff" : "#fff",
              }}
            >
              <Text
                style={{
                  fontWeight: "600",
                  color: selectedMemberId === m.id ? semanticColors.primary : "#374151",
                }}
              >
                {m.name}
                {m.id === myMemberId ? " (vos)" : ""}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Task mode toggle */}
        <Text style={{ fontWeight: "600", color: "#111", marginTop: 20, marginBottom: 8 }}>
          ¿Qué tarea?
        </Text>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#f3f4f6",
            borderRadius: 10,
            padding: 4,
            marginBottom: 12,
          }}
        >
          {[false, true].map((isCustom) => (
            <Pressable
              key={String(isCustom)}
              onPress={() => setUseCustom(isCustom)}
              style={{
                flex: 1,
                backgroundColor: useCustom === isCustom ? "#fff" : "transparent",
                borderRadius: 7,
                paddingVertical: 7,
                alignItems: "center",
                elevation: useCustom === isCustom ? 1 : 0,
              }}
            >
              <Text
                style={{
                  fontWeight: "600",
                  fontSize: 13,
                  color: useCustom === isCustom ? "#111" : "#6b7280",
                }}
              >
                {isCustom ? "Personalizada" : "Del catálogo"}
              </Text>
            </Pressable>
          ))}
        </View>

        {useCustom ? (
          <TextInput
            value={customTask}
            onChangeText={setCustomTask}
            placeholder="ej: Limpiar el garage"
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 10,
              padding: 12,
              fontSize: 14,
            }}
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ maxHeight: 200 }}
          >
            <View style={{ gap: 6 }}>
              {allTasks.slice(0, 20).map((task) => (
                <Pressable
                  key={task.id}
                  onPress={() => setSelectedTaskId(task.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: selectedTaskId === task.id ? semanticColors.primary : "#e5e7eb",
                    backgroundColor: selectedTaskId === task.id ? "#eff6ff" : "#fff",
                    minWidth: 180,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: selectedTaskId === task.id ? "700" : "500",
                      color: selectedTaskId === task.id ? semanticColors.primary : "#374151",
                      fontSize: 13,
                    }}
                    numberOfLines={1}
                  >
                    {task.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Spin button */}
        <Pressable
          onPress={result ? handleReset : handleSpin}
          disabled={assignM.isPending}
          style={{
            backgroundColor: result ? "#6b7280" : semanticColors.primary,
            borderRadius: 14,
            padding: 16,
            alignItems: "center",
            marginTop: 24,
            opacity: assignM.isPending ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 17 }}>
            {assignM.isPending ? "Asignando..." : result ? "🔄 Girar de nuevo" : "🎰 Girar ruleta"}
          </Text>
        </Pressable>

        {/* Result */}
        {result && <ResultCard result={result} />}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
