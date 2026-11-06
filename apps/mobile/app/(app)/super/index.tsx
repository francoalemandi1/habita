import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader, useScreenHeaderScroll } from "@/components/ds";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useThemeColors } from "@/hooks/use-theme";
import { spacing } from "@/theme";
import { mobileApi } from "@/lib/api";
import { useAiJobStatus } from "@/hooks/use-ai-job-status";
import { useShoppingPlan } from "@/hooks/use-shopping-plan";
import { isSuperSegment, SuperSegments } from "@/components/features/super/super-segments";
import { ListaView } from "@/components/features/super/lista/lista-view";
import { CompararView } from "@/components/features/super/comparar/comparar-view";
import { OfertasView } from "@/components/features/super/ofertas/ofertas-view";

import type { SuperSegment } from "@/components/features/super/super-segments";
import type { ThemeColors } from "@/theme";
import type { SearchItem, ShoppingPlanResult } from "@habita/contracts";

/** Súper level 0 (design handoff §5.3): Lista/Comparar/Ofertas segmented switcher. */
export default function SuperScreen(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { v } = useLocalSearchParams<{ v?: string }>();
  const segment: SuperSegment = isSuperSegment(v) ? v : "lista";
  const { scrollY, scrollHandler } = useScreenHeaderScroll();

  const { me, activeHouseholdId } = useMobileAuth();
  const myMember = useMemo(
    () => me?.members.find((member) => member.householdId === activeHouseholdId) ?? null,
    [me, activeHouseholdId],
  );
  const currentMemberId = myMember?.id ?? "";

  const [searchItems, setSearchItems] = useState<SearchItem[]>([]);
  const [shoppingResult, setShoppingResult] = useState<ShoppingPlanResult | null>(null);
  const [shoppingError, setShoppingError] = useState<string | null>(null);
  const shoppingPlan = useShoppingPlan();
  const { isRunning: isShoppingJobRunning, refetchStatus } = useAiJobStatus({
    jobType: "SHOPPING_PLAN",
    onComplete: async (jobId) => {
      try {
        const result = await mobileApi.get<{ resultData: ShoppingPlanResult }>(`/api/ai/job-result/${jobId}`);
        setShoppingResult(result.resultData);
        setShoppingError(null);
      } catch {
        setShoppingError("No se pudo cargar la comparación");
      }
    },
    onError: (errorMessage) => setShoppingError(errorMessage ?? "No se pudo comparar precios"),
  });

  function handleSegmentChange(next: SuperSegment): void {
    router.setParams({ v: next });
  }

  async function handleCompare(items: SearchItem[]): Promise<void> {
    setSearchItems(items);
    setShoppingError(null);
    try {
      await shoppingPlan.mutateAsync({ searchItems: items });
      await refetchStatus();
    } catch {
      setShoppingError("No se pudo iniciar la comparación");
    }
    router.setParams({ v: "comparar" });
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader variant="tab" title="Súper" scrollY={scrollY} />

      <View style={styles.segmentsBlock}>
        <SuperSegments value={segment} onValueChange={handleSegmentChange} />
      </View>

      <View style={styles.content}>
        {segment === "lista" ? (
          <ListaView
            currentMemberId={currentMemberId}
            onCompare={(items) => void handleCompare(items)}
            onScroll={scrollHandler}
          />
        ) : null}
        {segment === "comparar" ? (
          <CompararView
            searchItems={searchItems}
            data={shoppingResult}
            isLoading={shoppingPlan.isPending || isShoppingJobRunning}
            error={shoppingError}
            onRetry={searchItems.length > 0 ? () => void handleCompare(searchItems) : undefined}
            onScroll={scrollHandler}
          />
        ) : null}
        {segment === "ofertas" ? <OfertasView onScroll={scrollHandler} /> : null}
      </View>
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.paper },
    segmentsBlock: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
    content: { flex: 1 },
  });
}
