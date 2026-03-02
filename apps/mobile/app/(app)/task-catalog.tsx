import { useMemo, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTaskCatalog } from "@/hooks/use-task-management";
import { useMembers } from "@/hooks/use-members";
import { useCreateTask, useCreateAssignment } from "@/hooks/use-task-management";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { semanticColors } from "@habita/design-tokens";

import type { CatalogTask } from "@/hooks/use-task-management";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function dueDateToIso(dateValue: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const parsed = new Date(`${dateValue}T09:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

interface AssignSheetProps {
  task: CatalogTask;
  onClose: () => void;
}

function AssignSheet({ task, onClose }: AssignSheetProps) {
  const membersQuery = useMembers();
  const createTask = useCreateTask();
  const createAssignment = useCreateAssignment();

  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [dueDate, setDueDate] = useState(todayIsoDate());
  const [error, setError] = useState<string | null>(null);

  const members = membersQuery.data?.members ?? [];
  const isSubmitting = createTask.isPending || createAssignment.isPending;

  const handleAssign = async () => {
    setError(null);
    if (!selectedMemberId) {
      setError("Seleccioná un miembro.");
      return;
    }
    const dueDateIso = dueDateToIso(dueDate);
    if (!dueDateIso) {
      setError("Fecha inválida.");
      return;
    }

    try {
      const created = await createTask.mutateAsync({
        name: task.name,
        frequency: task.defaultFrequency as "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "ONCE",
        weight: task.defaultWeight,
        estimatedMinutes: task.estimatedMinutes ?? undefined,
        minAge: task.minAge ?? undefined,
        isRouletteEligible: false,
      });
      await createAssignment.mutateAsync({
        taskId: created.task.id,
        memberId: selectedMemberId,
        dueDate: dueDateIso,
      });
      router.replace("/(app)/tasks");
    } catch (err) {
      setError(getMobileErrorMessage(err));
    }
  };

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#ffffff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        gap: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <Text style={{ fontSize: 17, fontWeight: "700", color: "#111111" }}>{task.name}</Text>
      {task.estimatedMinutes ? (
        <Text style={{ color: "#6b7280", fontSize: 13 }}>
          ~{task.estimatedMinutes} min · Peso {task.defaultWeight}
        </Text>
      ) : null}

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: "#374151", fontSize: 14 }}>Asignar a</Text>
        {membersQuery.isLoading ? (
          <ActivityIndicator />
        ) : (
          members.map((member) => {
            const isSelected = member.id === selectedMemberId;
            return (
              <Pressable
                key={member.id}
                onPress={() => setSelectedMemberId(member.id)}
                style={{
                  borderWidth: 1,
                  borderColor: isSelected ? semanticColors.primary : "#e5e7eb",
                  backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                  borderRadius: 8,
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                }}
              >
                <Text
                  style={{
                    color: "#111111",
                    fontWeight: isSelected ? "700" : "500",
                  }}
                >
                  {member.name}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "600", color: "#374151", fontSize: 14 }}>Vencimiento</Text>
        <TextInput
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          style={{
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 8,
            padding: 10,
            fontSize: 14,
            color: "#111111",
          }}
        />
      </View>

      {error ? <Text style={{ color: "#b91c1c", fontSize: 13 }}>{error}</Text> : null}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={onClose}
          style={{
            flex: 1,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
            backgroundColor: "#f3f4f6",
          }}
        >
          <Text style={{ fontWeight: "600", color: "#374151" }}>Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={() => void handleAssign()}
          disabled={!selectedMemberId || isSubmitting}
          style={{
            flex: 2,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
            backgroundColor: semanticColors.primary,
            opacity: !selectedMemberId || isSubmitting ? 0.6 : 1,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: "#ffffff", fontWeight: "700" }}>Asignar</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function TaskCatalogScreen() {
  const { data, isLoading, isError, error } = useTaskCatalog();
  const [search, setSearch] = useState("");
  const [selectedTask, setSelectedTask] = useState<CatalogTask | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    if (!query) return data.categories;

    return data.categories
      .map((cat) => ({
        ...cat,
        tasks: cat.tasks.filter((t) => t.name.toLowerCase().includes(query)),
      }))
      .filter((cat) => cat.tasks.length > 0);
  }, [data, search]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <View
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#111111" }}>
            Catálogo de tareas
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: semanticColors.primary, fontWeight: "600" }}>Cerrar</Text>
          </Pressable>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar tarea..."
          placeholderTextColor="#9ca3af"
          style={{
            marginTop: 12,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 10,
            padding: 10,
            fontSize: 14,
            color: "#111111",
          }}
        />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={semanticColors.primary} />
        </View>
      ) : null}

      {isError ? (
        <Text style={{ margin: 20, color: "#b91c1c" }}>{getMobileErrorMessage(error)}</Text>
      ) : null}

      <ScrollView style={{ flex: 1, marginTop: 12 }} contentContainerStyle={{ padding: 20 }}>
        {filtered.map((category) => {
          const isExpanded = expandedCategories.has(category.category);
          return (
            <View key={category.category} style={{ marginBottom: 12 }}>
              <Pressable
                onPress={() => toggleCategory(category.category)}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#f9fafb",
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ fontWeight: "700", color: "#111111" }}>
                  {category.icon} {category.label}
                </Text>
                <Text style={{ color: "#6b7280", fontSize: 13 }}>
                  {category.tasks.length} tareas {isExpanded ? "▲" : "▼"}
                </Text>
              </Pressable>

              {isExpanded
                ? category.tasks.map((task) => (
                    <Pressable
                      key={task.name}
                      onPress={() => setSelectedTask(task)}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottomWidth: 1,
                        borderBottomColor: "#f3f4f6",
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#111111", fontWeight: "500" }}>{task.name}</Text>
                        {task.estimatedMinutes ? (
                          <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                            ~{task.estimatedMinutes} min
                          </Text>
                        ) : null}
                      </View>
                      <Text
                        style={{
                          color: semanticColors.primary,
                          fontWeight: "700",
                          fontSize: 12,
                        }}
                      >
                        Asignar
                      </Text>
                    </Pressable>
                  ))
                : null}
            </View>
          );
        })}

        {!isLoading && filtered.length === 0 ? (
          <Text style={{ color: "#6b7280", textAlign: "center" }}>
            No hay tareas que coincidan con "{search}".
          </Text>
        ) : null}
      </ScrollView>

      {selectedTask ? (
        <AssignSheet task={selectedTask} onClose={() => setSelectedTask(null)} />
      ) : null}
    </SafeAreaView>
  );
}
