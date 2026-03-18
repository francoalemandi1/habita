import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ChefHat, ChevronRight, Compass, ShoppingCart } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius, spacing } from "@/theme";

import type { LucideIcon } from "lucide-react-native";
import type { ThemeColors } from "@/theme";
import type { AssignmentSummary } from "@habita/contracts";

// Inline task type detection (mirrors src/lib/task-type-detection.ts)
const SHOPPING_KEYWORDS = ["compras", "supermercado", "comprar", "mercado", "super", "almacén", "verdulería"];
const COOKING_KEYWORDS = ["cocinar", "preparar", "almuerzo", "cena", "comida", "desayuno", "merienda", "receta"];

function isShoppingTask(name: string): boolean {
  const lower = name.toLowerCase();
  return SHOPPING_KEYWORDS.some((kw) => lower.includes(kw));
}

function isCookingTask(name: string): boolean {
  const lower = name.toLowerCase();
  return COOKING_KEYWORDS.some((kw) => lower.includes(kw));
}

interface Bridge {
  Icon: LucideIcon;
  message: string;
  route: string;
  bg: string;
  iconColor: string;
}

interface ContextualBridgesProps {
  assignments: AssignmentSummary[];
  allDone: boolean;
  hasLocation: boolean;
}

export function ContextualBridges({ assignments, allDone, hasLocation }: ContextualBridgesProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const pendingNames = assignments
    .filter((a) => a.status !== "COMPLETED" && a.status !== "VERIFIED")
    .map((a) => a.task.name);

  const bridges: Bridge[] = [];

  if (pendingNames.some(isShoppingTask)) {
    bridges.push({
      Icon: ShoppingCart,
      message: "Compará precios antes de ir al super",
      route: "/(app)/compras",
      bg: `${colors.successBg}`,
      iconColor: colors.successText,
    });
  }

  if (pendingNames.some(isCookingTask)) {
    bridges.push({
      Icon: ChefHat,
      message: "Buscá recetas para lo que vas a cocinar",
      route: "/(app)/cocina",
      bg: colors.warningBg,
      iconColor: colors.warningText,
    });
  }

  if (allDone && hasLocation) {
    bridges.push({
      Icon: Compass,
      message: "¡Todo listo! Descubrí qué hacer hoy",
      route: "/(app)/descubrir",
      bg: `${colors.primary}10`,
      iconColor: colors.primary,
    });
  }

  if (bridges.length === 0) return null;

  return (
    <View style={styles.container}>
      {bridges.map((bridge) => (
        <Pressable
          key={bridge.route}
          onPress={() => router.push(bridge.route as never)}
          style={[styles.bridge, { backgroundColor: bridge.bg }]}
        >
          <bridge.Icon size={16} color={bridge.iconColor} />
          <Text style={styles.bridgeText}>{bridge.message}</Text>
          <ChevronRight size={14} color={colors.mutedForeground} />
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.xs,
    },
    bridge: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    bridgeText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "500",
      color: c.text,
      flex: 1,
    },
  });
}
