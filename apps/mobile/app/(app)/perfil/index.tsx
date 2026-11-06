import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Avatar, ScreenHeader, SkeletonGate, Skeleton } from "@/components/ds";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useHouseholdDetail } from "@/hooks/use-households";
import { useMembers } from "@/hooks/use-members";
import { HouseholdSection } from "@/components/features/perfil/household-section";
import { HouseholdSwitcher } from "@/components/features/perfil/household-switcher";
import { SettingsRows } from "@/components/features/perfil/settings-rows";
import { InviteSheet } from "@/components/features/perfil/invite-sheet";
import { EditNameSheet } from "@/components/features/perfil/edit-name-sheet";
import { LeaveHouseholdDialog } from "@/components/features/perfil/leave-household-dialog";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

export default function PerfilScreen(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { me, activeHouseholdId, setHouseholdId, hydrate, logout } = useMobileAuth();
  const householdQuery = useHouseholdDetail();
  const membersQuery = useMembers();

  const [showInvite, setShowInvite] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [showLeave, setShowLeave] = useState(false);

  const myMember = me?.members.find((m) => m.householdId === activeHouseholdId) ?? me?.members[0];
  const household = householdQuery.data?.household ?? null;
  const members = membersQuery.data?.members ?? [];
  const isLoading = householdQuery.isLoading || membersQuery.isLoading;

  const handleSwitchHousehold = async (householdId: string) => {
    await setHouseholdId(householdId);
    await hydrate();
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader variant="detail" title="Perfil" backLabel="Casa" onBack={() => router.back()} />
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={householdQuery.isRefetching}
            onRefresh={() => void householdQuery.refetch()}
            tintColor={colors.monte}
          />
        }
      >
        <Pressable style={styles.profileHeader} onPress={() => setShowEditName(true)}>
          <Avatar name={myMember?.name ?? me?.name ?? "?"} size={56} isCurrentUser />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{myMember?.name ?? me?.name ?? "—"}</Text>
            <Text style={styles.profileEmail}>{me?.email ?? ""}</Text>
          </View>
        </Pressable>

        <SkeletonGate
          loading={isLoading}
          skeleton={
            <View style={styles.skeletonBlock}>
              <Skeleton height={60} />
              <Skeleton height={60} />
            </View>
          }
        >
          {household ? (
            <HouseholdSection
              householdName={household.name}
              members={members}
              currentMemberId={myMember?.id}
              onInvitePress={() => setShowInvite(true)}
              household={household}
              onboardingProfile={household.onboardingProfile}
            />
          ) : null}
        </SkeletonGate>

        <SettingsRows onEditNamePress={() => setShowEditName(true)} />

        {me?.households.length ? (
          <HouseholdSwitcher
            households={me.households}
            activeHouseholdId={activeHouseholdId}
            onSelect={(id) => void handleSwitchHousehold(id)}
          />
        ) : null}

        <View style={styles.footer}>
          <Pressable onPress={() => void handleLogout()}>
            <Text style={styles.logout}>Cerrar sesión</Text>
          </Pressable>
          {household ? (
            <Pressable onPress={() => setShowLeave(true)}>
              <Text style={styles.leave}>Salir de la casa</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {household ? (
        <>
          <InviteSheet
            visible={showInvite}
            onClose={() => setShowInvite(false)}
            householdName={household.name}
            inviteCode={household.inviteCode}
          />
          <LeaveHouseholdDialog
            visible={showLeave}
            onClose={() => setShowLeave(false)}
            householdName={household.name}
          />
        </>
      ) : null}

      {myMember ? (
        <EditNameSheet
          visible={showEditName}
          onClose={() => setShowEditName(false)}
          memberId={myMember.id}
          initialName={myMember.name}
        />
      ) : null}
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.paper,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 40,
    },
    skeletonBlock: {
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    profileHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 20,
      color: c.ink,
    },
    profileEmail: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
      marginTop: 2,
    },
    footer: {
      marginTop: spacing.xxl,
      gap: spacing.lg,
      alignItems: "center",
    },
    logout: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 15,
      color: c.ink2,
    },
    leave: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 15,
      color: c.ladrilloText,
    },
  });
}
