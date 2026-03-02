import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSuggestTasks } from "@/hooks/use-suggest-tasks";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { semanticColors } from "@habita/design-tokens";

import type { SuggestedTask, TaskCategory } from "@/hooks/use-suggest-tasks";

const FREQ_LABELS: Record<SuggestedTask["frequency"], string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
};

// ── Category section ────────────────────────────────────────────────────────

function CategorySection({ category }: { category: TaskCategory }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={{ marginBottom: 14 }}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingVertical: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 20 }}>{category.icon}</Text>
          <Text style={{ fontWeight: "700", color: "#111", fontSize: 15 }}>{category.label}</Text>
          <View
            style={{
              backgroundColor: "#f3f4f6",
              borderRadius: 10,
              paddingHorizontal: 7,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 11, color: "#6b7280" }}>{category.tasks.length}</Text>
          </View>
        </View>
        <Text style={{ color: "#6b7280" }}>{expanded ? "▲" : "▼"}</Text>
      </Pressable>

      {expanded && (
        <View style={{ gap: 6 }}>
          {category.tasks.map((task, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
                backgroundColor: "#f9fafb",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <Text style={{ fontSize: 18, marginTop: 1 }}>{task.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600", color: "#111", fontSize: 14 }}>{task.name}</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  <Text style={{ fontSize: 11, color: "#6b7280" }}>
                    {FREQ_LABELS[task.frequency]}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#6b7280" }}>
                    ~{task.estimatedMinutes} min · Peso {task.weight}
                  </Text>
                </View>
                {task.reason && (
                  <Text style={{ fontSize: 11, color: "#7c3aed", marginTop: 3 }}>
                    ✨ {task.reason}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function SuggestTasksScreen() {
  const [hasChildren, setHasChildren] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const suggestM = useSuggestTasks();

  const handleGenerate = () => {
    suggestM.mutate({
      hasChildren,
      hasPets,
      location: location.trim() || undefined,
      householdDescription: description.trim() || undefined,
    });
  };

  const categories = suggestM.data?.categories ?? [];
  const insights = suggestM.data?.insights ?? [];
  const totalTasks = categories.reduce((sum, c) => sum + c.tasks.length, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", padding: 20 }}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#111" }}>Sugerencias de tareas</Text>
        <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
          Contanos sobre tu hogar y te sugerimos el catálogo ideal de tareas.
        </Text>

        {/* Toggles */}
        <View
          style={{
            marginTop: 20,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {[
            { label: "Hay niños en el hogar", value: hasChildren, onToggle: setHasChildren, emoji: "👶" },
            { label: "Hay mascotas", value: hasPets, onToggle: setHasPets, emoji: "🐾" },
          ].map((row, i) => (
            <View
              key={row.label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 14,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: "#f3f4f6",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 18 }}>{row.emoji}</Text>
                <Text style={{ fontSize: 14, color: "#111" }}>{row.label}</Text>
              </View>
              <Switch
                value={row.value}
                onValueChange={row.onToggle}
                trackColor={{ false: "#e5e7eb", true: semanticColors.primary }}
              />
            </View>
          ))}
        </View>

        {/* Location */}
        <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 16, marginBottom: 6 }}>
          Ciudad / zona (opcional)
        </Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="ej: Buenos Aires, Palermo"
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 10,
            padding: 12,
            fontSize: 14,
          }}
        />

        {/* Description */}
        <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 14, marginBottom: 6 }}>
          Descripción del hogar (opcional)
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="ej: Apartamento de 3 ambientes, vivimos 2 adultos y 1 perro..."
          multiline
          numberOfLines={3}
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 10,
            padding: 12,
            fontSize: 14,
            minHeight: 80,
            textAlignVertical: "top",
          }}
        />

        {/* Generate button */}
        <Pressable
          onPress={handleGenerate}
          disabled={suggestM.isPending}
          style={{
            backgroundColor: semanticColors.primary,
            borderRadius: 12,
            padding: 14,
            alignItems: "center",
            marginTop: 16,
            opacity: suggestM.isPending ? 0.7 : 1,
          }}
        >
          {suggestM.isPending ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                Generando sugerencias...
              </Text>
            </View>
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              Sugerir tareas ✨
            </Text>
          )}
        </Pressable>

        {/* Error */}
        {suggestM.isError && (
          <View style={{ backgroundColor: "#fee2e2", borderRadius: 10, padding: 12, marginTop: 12 }}>
            <Text style={{ color: "#b91c1c", fontSize: 13 }}>
              {getMobileErrorMessage(suggestM.error)}
            </Text>
          </View>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <View
            style={{
              marginTop: 16,
              backgroundColor: "#f5f3ff",
              borderRadius: 12,
              padding: 12,
              borderLeftWidth: 3,
              borderLeftColor: "#7c3aed",
            }}
          >
            {insights.map((insight, i) => (
              <Text key={i} style={{ color: "#5b21b6", fontSize: 13, marginBottom: i < insights.length - 1 ? 4 : 0 }}>
                ✨ {insight}
              </Text>
            ))}
          </View>
        )}

        {/* Results */}
        {categories.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontWeight: "700", color: "#111", fontSize: 16, marginBottom: 12 }}>
              {totalTasks} tareas sugeridas en {categories.length} categorías
            </Text>
            {categories.map((cat) => (
              <CategorySection key={cat.name} category={cat} />
            ))}
          </View>
        )}

        {/* Empty state */}
        {!suggestM.isPending && !suggestM.data && !suggestM.isError && (
          <View style={{ marginTop: 40, alignItems: "center" }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🏠</Text>
            <Text style={{ color: "#6b7280", textAlign: "center", fontSize: 14 }}>
              Configurá tu hogar y generamos{"\n"}un catálogo de tareas personalizado.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
