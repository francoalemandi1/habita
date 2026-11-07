import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { spacing } from "@/theme";
import { PlanView } from "@/components/features/tareas/plan/plan-view";

/** /tareas/plan (handoff §5.2/§5.3): full screen, no tab bar, X closes. */
export default function PlanScreen(): React.JSX.Element {
  const colors = useThemeColors();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.paper }]} edges={["top"]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        hitSlop={8}
        onPress={() => router.back()}
        style={styles.closeButton}
      >
        <X size={22} strokeWidth={1.75} color={colors.ink} />
      </Pressable>
      <PlanView />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  closeButton: {
    alignSelf: "flex-end",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
});
