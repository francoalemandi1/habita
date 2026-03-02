import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { useMembers } from "@/hooks/use-members";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useCreateAssignment, useCreateTask } from "@/hooks/use-task-management";
import { semanticColors } from "@habita/design-tokens";

import type { TaskFrequency } from "@habita/contracts";

const FREQUENCY_OPTIONS: Array<{ label: string; value: TaskFrequency }> = [
  { label: "Diaria", value: "DAILY" },
  { label: "Semanal", value: "WEEKLY" },
  { label: "Quincenal", value: "BIWEEKLY" },
  { label: "Mensual", value: "MONTHLY" },
  { label: "Una vez", value: "ONCE" },
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function dueDateToIsoStartOfDay(dateValue: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return null;
  }
  const parsed = new Date(`${dateValue}T09:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

export default function NewTaskScreen() {
  const membersQuery = useMembers();
  const createTask = useCreateTask();
  const createAssignment = useCreateAssignment();

  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState("1");
  const [frequency, setFrequency] = useState<TaskFrequency>("WEEKLY");
  const [dueDate, setDueDate] = useState(todayIsoDate());
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const members = membersQuery.data?.members ?? [];
  const isSubmitting = createTask.isPending || createAssignment.isPending;

  const canSubmit = useMemo(() => {
    return taskName.trim().length >= 2 && selectedMemberId.length > 0 && !isSubmitting;
  }, [taskName, selectedMemberId, isSubmitting]);

  const handleSubmit = async () => {
    setError(null);

    const parsedWeight = Number.parseInt(weight, 10);
    const taskWeight = Number.isFinite(parsedWeight) ? parsedWeight : 1;
    if (taskWeight < 1 || taskWeight > 5) {
      setError("El peso debe estar entre 1 y 5.");
      return;
    }

    const dueDateIso = dueDateToIsoStartOfDay(dueDate);
    if (!dueDateIso) {
      setError("Usá fecha con formato YYYY-MM-DD.");
      return;
    }

    if (!selectedMemberId) {
      setError("Seleccioná a quién asignar la tarea.");
      return;
    }

    try {
      const createdTask = await createTask.mutateAsync({
        name: taskName.trim(),
        description: description.trim() ? description.trim() : undefined,
        frequency,
        weight: taskWeight,
        isRouletteEligible: false,
      });

      await createAssignment.mutateAsync({
        taskId: createdTask.task.id,
        memberId: selectedMemberId,
        dueDate: dueDateIso,
      });

      router.replace("/(app)/tasks");
    } catch (submitError) {
      setError(getMobileErrorMessage(submitError));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", padding: 20 }}>
      <ScrollView>
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Nueva tarea</Text>
          <Text style={{ color: "#6b7280" }}>Creá y asigná una tarea en un solo paso.</Text>

          <TextInput
            placeholder="Nombre de la tarea"
            value={taskName}
            onChangeText={setTaskName}
            style={{ borderWidth: 1, borderColor: "#dddddd", borderRadius: 10, padding: 12 }}
          />

          <TextInput
            placeholder="Descripción (opcional)"
            value={description}
            onChangeText={setDescription}
            style={{ borderWidth: 1, borderColor: "#dddddd", borderRadius: 10, padding: 12 }}
          />

          <TextInput
            placeholder="Peso (1 a 5)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="number-pad"
            style={{ borderWidth: 1, borderColor: "#dddddd", borderRadius: 10, padding: 12 }}
          />

          <TextInput
            placeholder="Vencimiento (YYYY-MM-DD)"
            value={dueDate}
            onChangeText={setDueDate}
            autoCapitalize="none"
            style={{ borderWidth: 1, borderColor: "#dddddd", borderRadius: 10, padding: 12 }}
          />

          <View>
            <Text style={{ marginBottom: 6, fontWeight: "600", color: "#111111" }}>Frecuencia</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {FREQUENCY_OPTIONS.map((option) => {
                const isActive = option.value === frequency;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setFrequency(option.value)}
                    style={{
                      borderWidth: 1,
                      borderColor: isActive ? semanticColors.primary : "#d1d5db",
                      backgroundColor: isActive ? "#eff6ff" : "#ffffff",
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: "#111111", fontWeight: isActive ? "700" : "500", fontSize: 12 }}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={{ marginBottom: 6, fontWeight: "600", color: "#111111" }}>Asignar a</Text>
            {membersQuery.isLoading ? <Text style={{ color: "#6b7280" }}>Cargando miembros...</Text> : null}
            {members.map((member) => {
              const isSelected = member.id === selectedMemberId;
              return (
                <Pressable
                  key={member.id}
                  onPress={() => setSelectedMemberId(member.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: isSelected ? semanticColors.primary : "#e5e7eb",
                    backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                    borderRadius: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: "#111111", fontWeight: isSelected ? "700" : "500" }}>{member.name}</Text>
                </Pressable>
              );
            })}
          </View>

          {error ? <Text style={{ color: "#b91c1c" }}>{error}</Text> : null}

          <Pressable
            onPress={() => void handleSubmit()}
            style={{
              backgroundColor: semanticColors.primary,
              borderRadius: 10,
              paddingVertical: 12,
              alignItems: "center",
              opacity: canSubmit ? 1 : 0.65,
            }}
            disabled={!canSubmit}
          >
            <Text style={{ color: "#ffffff", fontWeight: "600" }}>
              {isSubmitting ? "Guardando..." : "Crear y asignar tarea"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
