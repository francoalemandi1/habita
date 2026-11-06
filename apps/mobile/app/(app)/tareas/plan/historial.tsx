import { router } from "expo-router";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { PlanHistorialView } from "@/components/features/tareas/plan/plan-historial-view";

/** /tareas/plan/historial (handoff §5.2, replaces plans.tsx). */
export default function PlanHistorialScreen(): React.JSX.Element {
  const colors = useThemeColors();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.paper }]} edges={["top"]}>
      <ScreenHeader variant="detail" title="Historial de planes" backLabel="Plan" onBack={() => router.back()} />
      <PlanHistorialView />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
