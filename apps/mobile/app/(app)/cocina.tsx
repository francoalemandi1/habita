import { useState, useCallback, useMemo, useEffect } from "react";
import { Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Bookmark,
  BookmarkCheck,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Clock,
  Mic,
  Share2,
  Users,
  Zap,
} from "lucide-react-native";
import { useCocina } from "@/hooks/use-cocina";
import { useAiJobStatus } from "@/hooks/use-ai-job-status";
import { useSavedRecipes, useToggleSaveRecipe } from "@/hooks/use-saved-recipes";
import { mobileApi } from "@/lib/api";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useMilestone } from "@/hooks/use-milestone";
import { useCelebration } from "@/hooks/use-celebration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { TabBar } from "@/components/ui/tab-bar";
import { StyledTextInput } from "@/components/ui/text-input";
import { ScreenHeader } from "@/components/features/screen-header";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius, spacing, typography } from "@/theme";
import { useFirstVisit } from "@/hooks/use-first-visit";
import { SectionGuideCard } from "@/components/features/section-guide-card";
import { useSectionToured } from "@/hooks/use-guided-tour";
import { Sparkles, Heart } from "lucide-react-native";

import type { ThemeColors } from "@/theme";
import type { MealType, Recipe } from "@/hooks/use-cocina";
import type { SavedRecipe, SaveRecipeInput } from "@/hooks/use-saved-recipes";

// ─── constants ──────────────────────────────────────────────────────────────


const DIFFICULTY_CONFIG: Record<Recipe["difficulty"], { label: string; bg: string; text: string }> = {
  facil: { label: "Fácil", bg: "#dcfce7", text: "#16a34a" },
  media: { label: "Media", bg: "#fef9c3", text: "#d97706" },
  dificil: { label: "Difícil", bg: "#fee2e2", text: "#b91c1c" },
};

const INGREDIENTS_COLLAPSED_LIMIT = 6;

// ─── helpers ────────────────────────────────────────────────────────────────

function autoDetectMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 15) return "almuerzo";
  return "cena";
}

function getSpeedBadge(minutes: number): { label: string; bg: string; text: string } | null {
  if (minutes <= 15) return { label: "Rápida", bg: "#dcfce7", text: "#16a34a" };
  if (minutes <= 30) return { label: "Media", bg: "#dbeafe", text: "#2563eb" };
  if (minutes >= 60) return { label: "Elaborada", bg: "#f3e8ff", text: "#7c3aed" };
  return null;
}

function recipeToSaveInput(recipe: Recipe): SaveRecipeInput {
  return {
    title: recipe.title,
    description: recipe.description,
    difficulty: recipe.difficulty,
    prepTimeMinutes: recipe.prepTimeMinutes,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    missingIngredients: recipe.missingIngredients,
    steps: recipe.steps,
    tip: recipe.tip,
  };
}

async function handleShareRecipe(recipe: Recipe | SavedRecipe): Promise<void> {
  const difficultyLabel: Record<string, string> = {
    facil: "Fácil",
    media: "Media",
    dificil: "Difícil",
  };
  const label = difficultyLabel[recipe.difficulty] ?? recipe.difficulty;
  const lines = [
    recipe.title,
    "",
    `🧑‍🍳 ${label} · ⏱ ${recipe.prepTimeMinutes} min · 🍽 ${recipe.servings} porciones`,
    "",
    "Ingredientes:",
    ...recipe.ingredients.map((i) => `• ${i}`),
    "",
    "Preparación:",
    ...recipe.steps.map((s, idx) => `${idx + 1}. ${s}`),
    ...(recipe.tip ? ["", `💡 ${recipe.tip}`] : []),
    "",
    "Organizado con Habita 🏠",
  ];
  const text = lines.join("\n");
  try {
    await Share.share({ message: text });
  } catch {
    // user cancelled
  }
}

// ─── RecipeCard ─────────────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  isSaved,
  onToggleSave,
  onShare,
  savePending,
}: {
  recipe: Recipe | SavedRecipe;
  isSaved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
  savePending: boolean;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllIngredients, setShowAllIngredients] = useState(false);

  const diffConfig = DIFFICULTY_CONFIG[recipe.difficulty as Recipe["difficulty"]] ?? DIFFICULTY_CONFIG.media;
  const speedBadge = getSpeedBadge(recipe.prepTimeMinutes);

  const visibleIngredients = showAllIngredients
    ? recipe.ingredients
    : recipe.ingredients.slice(0, INGREDIENTS_COLLAPSED_LIMIT);
  const hiddenCount = recipe.ingredients.length - INGREDIENTS_COLLAPSED_LIMIT;

  return (
    <Card style={styles.recipeCard}>
      <CardContent>
        {/* Header: title + difficulty badge + save */}
        <View style={styles.recipeHeader}>
          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          <Badge bgColor={diffConfig.bg} textColor={diffConfig.text}>
            {diffConfig.label}
          </Badge>
          <Pressable
            onPress={onToggleSave}
            hitSlop={8}
            style={styles.saveIconButton}
            disabled={savePending}
          >
            {isSaved ? (
              <BookmarkCheck size={18} color={colors.primary} />
            ) : (
              <Bookmark size={18} color={colors.mutedForeground} />
            )}
          </Pressable>
          <Pressable
            onPress={onShare}
            hitSlop={8}
            style={styles.saveIconButton}
          >
            <Share2 size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Meta badges: speed + time + servings */}
        <View style={styles.recipeMeta}>
          {speedBadge ? (
            <View style={[styles.speedBadge, { backgroundColor: speedBadge.bg }]}>
              <Zap size={11} color={speedBadge.text} />
              <Text style={[styles.speedBadgeText, { color: speedBadge.text }]}>
                {speedBadge.label}
              </Text>
            </View>
          ) : null}
          <View style={styles.recipeMetaChip}>
            <Clock size={11} color={colors.mutedForeground} />
            <Text style={styles.recipeMetaText}>{recipe.prepTimeMinutes} min</Text>
          </View>
          <View style={styles.recipeMetaChip}>
            <Users size={11} color={colors.mutedForeground} />
            <Text style={styles.recipeMetaText}>
              {recipe.servings} porcion{recipe.servings > 1 ? "es" : ""}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.recipeDesc}>{recipe.description}</Text>

        {/* Ingredients — pills (matching web) */}
        <View style={styles.ingredientsSection}>
          <Text style={styles.ingredientsSectionTitle}>Ingredientes:</Text>
          <View style={styles.ingredientPillsRow}>
            {visibleIngredients.map((ing, i) => (
              <View key={i} style={styles.ingredientPill}>
                <Text style={styles.ingredientPillText}>{ing}</Text>
              </View>
            ))}
            {!showAllIngredients && hiddenCount > 0 ? (
              <Pressable
                onPress={() => setShowAllIngredients(true)}
                style={styles.ingredientMorePill}
              >
                <Text style={styles.ingredientMoreText}>+{hiddenCount} más</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Missing ingredients */}
        {recipe.missingIngredients.length > 0 ? (
          <View style={styles.missingSection}>
            <Text style={styles.missingSectionTitle}>Te falta:</Text>
            <View style={styles.ingredientPillsRow}>
              {recipe.missingIngredients.map((ing, i) => (
                <View key={i} style={styles.missingPill}>
                  <Text style={styles.missingPillText}>{ing}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Expand/collapse steps button (web: "Ver pasos (N)") */}
        <Pressable
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.expandButton}
        >
          {isExpanded ? (
            <ChevronUp size={14} color={colors.primary} />
          ) : (
            <ChevronDown size={14} color={colors.primary} />
          )}
          <Text style={styles.expandButtonText}>
            {isExpanded ? "Ocultar pasos" : `Ver pasos (${recipe.steps.length})`}
          </Text>
        </Pressable>

        {/* Expanded steps */}
        {isExpanded ? (
          <View style={styles.stepsSection}>
            {recipe.steps.map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Tip */}
        {recipe.tip ? (
          <View style={styles.tip}>
            <Zap size={13} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <Text style={styles.tipText}>{recipe.tip}</Text>
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ─── main screen ────────────────────────────────────────────────────────────

export default function CocinaScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isFirstVisit, dismiss: dismissGuide } = useFirstVisit("cocina");
  const cocinaWasToured = useSectionToured("cocina");
  const recipeMilestone = useMilestone("first-recipe");
  const { celebrate } = useCelebration();
  const [activeTab, setActiveTab] = useState(0);
  const [textInput, setTextInput] = useState("");
  const mealType = autoDetectMealType();

  const cocinaM = useCocina();
  const savedRecipesQuery = useSavedRecipes();
  const { toggle: toggleSave, isPending: savePending } = useToggleSaveRecipe();
  const savedRecipes = savedRecipesQuery.data;

  // Result from background job
  const [cocinaResult, setCocinaResult] = useState<{ recipes: Recipe[]; summary: string } | null>(null);
  const [cocinaError, setCocinaError] = useState<string | null>(null);

  const { isRunning: isJobRunning, refetchStatus } = useAiJobStatus({
    jobType: "COCINA",
    onComplete: async (jobId) => {
      try {
        const result = await mobileApi.get<{
          resultData: { recipes: Recipe[]; summary: string; generatedAt: string };
        }>(`/api/ai/job-result/${jobId}`);
        setCocinaResult(result.resultData);
      } catch {
        setCocinaError("Error al obtener las recetas");
      }
    },
    onError: (errorMessage) => {
      setCocinaError(errorMessage ?? "Error al generar recetas");
    },
  });

  const handleGenerate = () => {
    if (!textInput.trim()) return;
    setCocinaError(null);
    cocinaM.mutate(
      { textInput: textInput.trim(), mealType },
      { onSuccess: () => { void refetchStatus(); } },
    );
  };

  const recipes = cocinaResult?.recipes ?? [];
  const summary = cocinaResult?.summary;

  // Celebrate first recipe generation
  useEffect(() => {
    if (recipes.length > 0) {
      void recipeMilestone.complete().then((wasFirst) => {
        if (wasFirst) celebrate("first-recipe");
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes.length]);

  const handleToggleSaveRecipe = useCallback(
    (recipe: Recipe) => {
      // Find if already saved by matching title + ingredients (server computes hash)
      const saved = savedRecipes?.find((r) => r.title === recipe.title);
      if (saved) {
        void toggleSave({ savedRecipeId: saved.id });
      } else {
        void toggleSave({ input: recipeToSaveInput(recipe) });
      }
    },
    [savedRecipes, toggleSave],
  );

  const handleRemoveSavedRecipe = useCallback(
    (savedRecipeId: string) => {
      void toggleSave({ savedRecipeId });
    },
    [toggleSave],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader />
      <ScrollView
        bounces={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          activeTab === 1 ? (
            <RefreshControl
              refreshing={savedRecipesQuery.isRefetching}
              tintColor={colors.primary}
              onRefresh={() => void savedRecipesQuery.refetch()}
            />
          ) : undefined
        }
      >
        {/* Title */}
        <View style={styles.titleRow}>
          <ChefHat size={22} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.title, { color: colors.text }]}>Cociná</Text>
        </View>
        <Text style={styles.subtitle}>
          Contanos qué tenés en la heladera y te sugerimos recetas
        </Text>

        {isFirstVisit && !cocinaWasToured ? (
          <SectionGuideCard
            steps={[
              {
                icon: <ChefHat size={16} color={colors.primary} />,
                title: "Decinos qué tenés",
                description: "Listá los ingredientes que hay en tu cocina",
              },
              {
                icon: <Sparkles size={16} color={colors.primary} />,
                title: "La IA sugiere recetas",
                description: "Recetas personalizadas con lo que ya tenés",
              },
              {
                icon: <Heart size={16} color={colors.primary} />,
                title: "Guardá y compartí",
                description: "Tus recetas favoritas siempre a mano",
              },
            ]}
            onDismiss={dismissGuide}
          />
        ) : null}

        {/* Tab bar: Cocinar / Recetas guardadas */}
        <TabBar
          tabs={[
            { label: "Cocinar" },
            { label: `Recetas guardadas${savedRecipes?.length ? ` (${savedRecipes.length})` : ""}` },
          ]}
          activeIndex={activeTab}
          onTabPress={setActiveTab}
          style={styles.tabBar}
        />

        {activeTab === 0 ? (
          <>
            {/* Input card (matches web's bordered input section) */}
            <Card style={styles.inputCard}>
              <CardContent>
                {/* Textarea */}
                <StyledTextInput
                  value={textInput}
                  onChangeText={setTextInput}
                  placeholder="Tengo pollo, arroz, pimientos, cebolla..."
                  multiline
                  numberOfLines={3}
                  style={styles.ingredientsInput}
                />
                <View style={styles.belowInputRow}>
                  <Pressable
                    onPress={() => {
                      /* Voice dictation — placeholder for future speech-to-text */
                    }}
                    style={styles.dictateButton}
                  >
                    <Mic size={14} color={colors.primary} />
                    <Text style={styles.dictateButtonText}>Dictar</Text>
                  </Pressable>
                  <Text style={styles.charCount}>{textInput.length}/2000</Text>
                </View>

                {/* Actions */}
                <Button
                  onPress={handleGenerate}
                  disabled={(cocinaM.isPending || isJobRunning) || !textInput.trim()}
                  loading={(cocinaM.isPending || isJobRunning)}
                >
                  {(cocinaM.isPending || isJobRunning) ? "Generando..." : "Sugerir recetas"}
                </Button>
              </CardContent>
            </Card>

            {/* Error */}
            {(cocinaM.isError || cocinaError) ? (
              <Card style={styles.errorCard}>
                <CardContent>
                  <Text style={styles.errorText}>{cocinaError ?? getMobileErrorMessage(cocinaM.error)}</Text>
                </CardContent>
              </Card>
            ) : null}

            {/* Summary */}
            {summary && !(cocinaM.isPending || isJobRunning) ? (
              <Text style={styles.summaryText}>{summary}</Text>
            ) : null}

            {/* Results */}
            {recipes.length > 0 ? (
              <View style={styles.recipesSection}>
                {recipes.map((recipe, i) => (
                  <RecipeCard
                    key={`${recipe.title}-${i}`}
                    recipe={recipe}
                    isSaved={!!savedRecipes?.find((r) => r.title === recipe.title)}
                    onToggleSave={() => handleToggleSaveRecipe(recipe)}
                    onShare={() => { void handleShareRecipe(recipe); }}
                    savePending={savePending}
                  />
                ))}
              </View>
            ) : null}

            {/* Empty state */}
            {!(cocinaM.isPending || isJobRunning) && !cocinaM.isError && !cocinaError && recipes.length === 0 && !cocinaResult ? (
              <EmptyState
                icon={<ChefHat size={40} color={colors.mutedForeground} />}
                title="Tu cocina te espera"
                subtitle={"Escribí los ingredientes que tenés\ny te sugerimos qué cocinar hoy"}
              />
            ) : null}
          </>
        ) : (
          /* Guardados tab */
          savedRecipesQuery.isLoading ? (
            <View style={styles.loadingList}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : !savedRecipes?.length ? (
            <EmptyState
              icon={<Bookmark size={32} color={colors.mutedForeground} />}
              title="Sin recetas guardadas"
              subtitle="Generá recetas y tocá el ícono de guardar para verlas acá"
            />
          ) : (
            <View style={styles.recipesSection}>
              {savedRecipes.map((saved) => (
                <RecipeCard
                  key={saved.id}
                  recipe={saved}
                  isSaved
                  onToggleSave={() => handleRemoveSavedRecipe(saved.id)}
                  onShare={() => { void handleShareRecipe(saved); }}
                  savePending={savePending}
                />
              ))}
            </View>
          )
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ─────────────────────────────────────────────────────────────────

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 24,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    title: {
      ...typography.pageTitle,
    },
    subtitle: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.mutedForeground,
      marginBottom: spacing.md,
    },

    // Input card
    inputCard: {
      marginBottom: spacing.md,
    },
    ingredientsInput: {
      minHeight: 80,
      textAlignVertical: "top",
    },
    belowInputRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
    },
    charCount: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: c.mutedForeground,
      marginBottom: spacing.md,
    },
    dictateButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 4,
    },
    dictateButtonText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "600",
      color: c.primary,
    },

    // Error
    errorCard: {
      backgroundColor: c.errorBg,
      marginBottom: spacing.md,
    },
    errorText: {
      fontFamily: fontFamily.sans,
      color: c.errorText,
      fontSize: 13,
    },

    // Summary
    summaryText: {
      fontFamily: fontFamily.sans,
      color: c.mutedForeground,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: spacing.md,
    },

    // Recipes
    recipesSection: {
      gap: spacing.md,
    },
    recipeCard: {
      marginBottom: 0,
    },
    recipeHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    recipeTitle: {
      fontFamily: fontFamily.sans,
      fontWeight: "600",
      color: c.text,
      fontSize: 14,
      flex: 1,
      lineHeight: 18,
    },
    recipeMeta: {
      flexDirection: "row",
      gap: 6,
      flexWrap: "wrap",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    speedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      borderRadius: radius.full,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    speedBadgeText: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "500",
    },
    recipeMetaChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    recipeMetaText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
    },
    recipeDesc: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      lineHeight: 17,
      color: c.mutedForeground,
      marginBottom: spacing.md,
    },

    // Ingredients — pills (matches web)
    ingredientsSection: {
      marginBottom: spacing.sm,
    },
    ingredientsSectionTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "500",
      color: c.text,
      marginBottom: 6,
    },
    ingredientPillsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
    },
    ingredientPill: {
      backgroundColor: "#ecfdf5",
      borderRadius: radius.full,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    ingredientPillText: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: "#065f46",
    },
    ingredientMorePill: {
      backgroundColor: `${c.muted}99`,
      borderRadius: radius.full,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    ingredientMoreText: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      fontWeight: "500",
      color: c.mutedForeground,
    },

    // Missing ingredients
    missingSection: {
      marginBottom: spacing.sm,
    },
    missingSectionTitle: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "500",
      color: "#d97706",
      marginBottom: 6,
    },
    missingPill: {
      backgroundColor: "#fffbeb",
      borderRadius: radius.full,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    missingPillText: {
      fontFamily: fontFamily.sans,
      fontSize: 11,
      color: c.warningText,
    },

    // Expand button (web: "Ver pasos (N)")
    expandButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    expandButtonText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      fontWeight: "500",
      color: c.primary,
    },

    // Steps
    stepsSection: {
      gap: 6,
      marginBottom: spacing.sm,
    },
    step: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    stepNumber: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: `${c.primary}1A`,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginTop: 1,
    },
    stepNumberText: {
      fontFamily: fontFamily.sans,
      color: c.primary,
      fontSize: 10,
      fontWeight: "600",
    },
    stepText: {
      fontFamily: fontFamily.sans,
      flex: 1,
      color: c.mutedForeground,
      fontSize: 12,
      lineHeight: 17,
    },

    // Tip
    tip: {
      flexDirection: "row",
      gap: 6,
      backgroundColor: "#fffbeb",
      borderRadius: radius.lg,
      padding: spacing.sm,
      marginTop: spacing.sm,
    },
    tipText: {
      fontFamily: fontFamily.sans,
      flex: 1,
      fontSize: 11,
      lineHeight: 16,
      color: c.warningText,
    },

    // Tab bar
    tabBar: {
      marginBottom: spacing.md,
    },

    // Save icon button
    saveIconButton: {
      padding: 4,
      flexShrink: 0,
    },

    // Loading
    loadingList: {
      gap: spacing.md,
    },

    bottomPadding: {
      height: 20,
    },
  });
}
