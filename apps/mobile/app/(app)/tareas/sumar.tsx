import { router } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { SumarView } from "@/components/features/tareas/sumar/sumar-view";

/** /tareas/sumar (handoff §5.2, replaces suggest-tasks.tsx + task-catalog.tsx). */
export default function SumarScreen(): React.JSX.Element {
  const colors = useThemeColors();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.paper }]} edges={["top"]}>
      <ScreenHeader variant="detail" title="Sumar tareas" backLabel="Tareas" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <SumarView />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
