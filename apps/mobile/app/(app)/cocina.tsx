import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCocina } from "@/hooks/use-cocina";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { semanticColors } from "@habita/design-tokens";

import type { MealType, Recipe } from "@/hooks/use-cocina";

// ── Constants ───────────────────────────────────────────────────────────────

const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: "almuerzo", label: "Almuerzo", emoji: "☀️" },
  { value: "cena", label: "Cena", emoji: "🌙" },
  { value: "merienda", label: "Merienda", emoji: "☕" },
  { value: "libre", label: "Libre", emoji: "🍽" },
];

const DIFFICULTY_LABELS: Record<Recipe["difficulty"], string> = {
  facil: "Fácil",
  media: "Media",
  dificil: "Difícil",
};

const DIFFICULTY_COLORS: Record<Recipe["difficulty"], string> = {
  facil: "#16a34a",
  media: "#d97706",
  dificil: "#b91c1c",
};

// ── Recipe Card ─────────────────────────────────────────────────────────────

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      style={{
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        backgroundColor: "#fff",
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontWeight: "700", color: "#111", fontSize: 15 }}>{recipe.title}</Text>
          <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 3 }} numberOfLines={expanded ? undefined : 2}>
            {recipe.description}
          </Text>
        </View>
        <Text style={{ fontSize: 18 }}>{expanded ? "▲" : "▼"}</Text>
      </View>

      {/* Meta chips */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <View style={{ backgroundColor: "#f3f4f6", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 12, color: "#374151" }}>⏱ {recipe.prepTimeMinutes} min</Text>
        </View>
        <View style={{ backgroundColor: "#f3f4f6", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 12, color: "#374151" }}>👥 {recipe.servings} porciones</Text>
        </View>
        <View
          style={{
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 3,
            backgroundColor:
              recipe.difficulty === "facil" ? "#dcfce7"
              : recipe.difficulty === "media" ? "#fef9c3"
              : "#fee2e2",
          }}
        >
          <Text style={{ fontSize: 12, color: DIFFICULTY_COLORS[recipe.difficulty], fontWeight: "600" }}>
            {DIFFICULTY_LABELS[recipe.difficulty]}
          </Text>
        </View>
      </View>

      {/* Missing ingredients warning */}
      {recipe.missingIngredients.length > 0 && (
        <View style={{ backgroundColor: "#fef9c3", borderRadius: 8, padding: 8, marginTop: 10 }}>
          <Text style={{ fontSize: 12, color: "#854d0e", fontWeight: "600" }}>
            Falta: {recipe.missingIngredients.join(", ")}
          </Text>
        </View>
      )}

      {/* Expanded content */}
      {expanded && (
        <View style={{ marginTop: 14 }}>
          {/* Ingredients */}
          <Text style={{ fontWeight: "700", color: "#111", marginBottom: 6 }}>Ingredientes</Text>
          {recipe.ingredients.map((ing, i) => (
            <Text key={i} style={{ color: "#374151", fontSize: 13, marginBottom: 2 }}>
              · {ing}
            </Text>
          ))}

          {/* Steps */}
          <Text style={{ fontWeight: "700", color: "#111", marginTop: 14, marginBottom: 6 }}>
            Preparación
          </Text>
          {recipe.steps.map((step, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: semanticColors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, color: "#374151", fontSize: 13, lineHeight: 20 }}>{step}</Text>
            </View>
          ))}

          {/* Tip */}
          {recipe.tip && (
            <View
              style={{
                backgroundColor: "#f0fdf4",
                borderRadius: 10,
                padding: 10,
                marginTop: 6,
                borderLeftWidth: 3,
                borderLeftColor: "#16a34a",
              }}
            >
              <Text style={{ fontSize: 13, color: "#166534" }}>💡 {recipe.tip}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function CocinaScreen() {
  const [textInput, setTextInput] = useState("");
  const [mealType, setMealType] = useState<MealType>("almuerzo");

  const cocinaM = useCocina();

  const handleGenerate = () => {
    if (!textInput.trim()) return;
    cocinaM.mutate({ textInput: textInput.trim(), mealType });
  };

  const recipes = cocinaM.data?.recipes ?? [];
  const summary = cocinaM.data?.summary;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", padding: 20 }}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#111" }}>Cociná</Text>
        <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>
          Contanos qué tenés en la heladera y te sugerimos recetas
        </Text>

        {/* Meal type selector */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          {MEAL_TYPES.map((mt) => (
            <Pressable
              key={mt.value}
              onPress={() => setMealType(mt.value)}
              style={{
                flex: 1,
                backgroundColor: mealType === mt.value ? semanticColors.primary : "#f3f4f6",
                borderRadius: 10,
                paddingVertical: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 16 }}>{mt.emoji}</Text>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: mealType === mt.value ? "#fff" : "#6b7280",
                  marginTop: 2,
                }}
              >
                {mt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Ingredients input */}
        <Text style={{ fontWeight: "600", color: "#111", marginTop: 16, marginBottom: 6 }}>
          ¿Qué tenés disponible?
        </Text>
        <TextInput
          value={textInput}
          onChangeText={setTextInput}
          placeholder={"ej: pollo, arroz, tomate, ajo, aceite de oliva..."}
          multiline
          numberOfLines={4}
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 12,
            padding: 12,
            fontSize: 14,
            color: "#111",
            minHeight: 100,
            textAlignVertical: "top",
          }}
        />

        {/* Generate button */}
        <Pressable
          onPress={handleGenerate}
          disabled={cocinaM.isPending || !textInput.trim()}
          style={{
            backgroundColor:
              cocinaM.isPending || !textInput.trim()
                ? "#e5e7eb"
                : semanticColors.primary,
            borderRadius: 12,
            padding: 14,
            alignItems: "center",
            marginTop: 12,
          }}
        >
          {cocinaM.isPending ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                Generando recetas...
              </Text>
            </View>
          ) : (
            <Text
              style={{
                fontWeight: "700",
                fontSize: 15,
                color: !textInput.trim() ? "#9ca3af" : "#fff",
              }}
            >
              Sugerí recetas ✨
            </Text>
          )}
        </Pressable>

        {/* Error */}
        {cocinaM.isError && (
          <View
            style={{
              backgroundColor: "#fee2e2",
              borderRadius: 10,
              padding: 12,
              marginTop: 12,
            }}
          >
            <Text style={{ color: "#b91c1c", fontSize: 13 }}>
              {getMobileErrorMessage(cocinaM.error)}
            </Text>
          </View>
        )}

        {/* Summary */}
        {summary && !cocinaM.isPending && (
          <View
            style={{
              backgroundColor: "#f0fdf4",
              borderRadius: 12,
              padding: 12,
              marginTop: 16,
              borderLeftWidth: 3,
              borderLeftColor: semanticColors.primary,
            }}
          >
            <Text style={{ color: "#166534", fontSize: 13 }}>{summary}</Text>
          </View>
        )}

        {/* Recipes */}
        {recipes.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: "700", color: "#111", fontSize: 16, marginBottom: 10 }}>
              {recipes.length} receta{recipes.length !== 1 ? "s" : ""} sugeridas
            </Text>
            {recipes.map((recipe, i) => (
              <RecipeCard key={i} recipe={recipe} />
            ))}
          </View>
        )}

        {/* Empty state after first use */}
        {!cocinaM.isPending && !cocinaM.isError && recipes.length === 0 && !cocinaM.data && (
          <View style={{ marginTop: 40, alignItems: "center" }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>👨‍🍳</Text>
            <Text style={{ color: "#6b7280", textAlign: "center", fontSize: 14 }}>
              Escribí los ingredientes que tenés{"\n"}y te sugerimos qué cocinar hoy.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
