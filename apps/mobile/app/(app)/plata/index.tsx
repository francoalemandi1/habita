import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus } from "lucide-react-native";
import { ScreenHeader, useScreenHeaderScroll } from "@/components/ds";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useMembers } from "@/hooks/use-members";
import { useThemeColors } from "@/hooks/use-theme";
import { spacing } from "@/theme";
import { PlataSegments, isPlataSegment } from "@/components/features/plata/plata-segments";
import { GastosView } from "@/components/features/plata/gastos/gastos-view";
import { SaldosView } from "@/components/features/plata/saldos-view";
import { FondoView } from "@/components/features/plata/fondo-view";

import type { PlataSegment } from "@/components/features/plata/plata-segments";
import type { ThemeColors } from "@/theme";

/** Plata level 0 (handoff §5.1 / §5.3): Gastos/Saldos/Fondo segmented switcher. */
export default function PlataScreen(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { v } = useLocalSearchParams<{ v?: string }>();
  const segment: PlataSegment = isPlataSegment(v) ? v : "gastos";
  const { scrollY, scrollHandler } = useScreenHeaderScroll();

  const { me, activeHouseholdId } = useMobileAuth();
  const membersQuery = useMembers();
  const members = useMemo(() => membersQuery.data?.members ?? [], [membersQuery.data]);

  const myMember = useMemo(
    () => me?.members.find((member) => member.householdId === activeHouseholdId) ?? null,
    [me, activeHouseholdId],
  );
  const currentMemberId = myMember?.id ?? "";
  const currentMemberType = members.find((member) => member.id === currentMemberId)?.memberType ?? "ADULT";
  const plataMembers = useMemo(() => members.map((member) => ({ id: member.id, name: member.name })), [members]);

  function handleSegmentChange(next: PlataSegment): void {
    router.setParams({ v: next });
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader
        variant="tab"
        title="Plata"
        scrollY={scrollY}
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nuevo gasto"
            hitSlop={8}
            onPress={() => router.push("/(app)/new-expense")}
          >
            <Plus size={22} strokeWidth={1.75} color={colors.monte} />
          </Pressable>
        }
      />

      <View style={styles.segmentsBlock}>
        <PlataSegments value={segment} onValueChange={handleSegmentChange} />
      </View>

      <View style={styles.content}>
        {segment === "gastos" ? (
          <GastosView
            currentMemberId={currentMemberId}
            currentMemberType={currentMemberType}
            members={plataMembers}
            onScroll={scrollHandler}
          />
        ) : null}
        {segment === "saldos" ? (
          <SaldosView currentMemberId={currentMemberId} currentMemberType={currentMemberType} members={plataMembers} />
        ) : null}
        {segment === "fondo" ? (
          <FondoView currentMemberId={currentMemberId} currentMemberType={currentMemberType} members={plataMembers} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.paper,
    },
    segmentsBlock: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.sm,
    },
    content: {
      flex: 1,
    },
  });
}
