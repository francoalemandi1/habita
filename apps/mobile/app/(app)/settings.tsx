import { useState } from "react";
import { router } from "expo-router";
import type { RelativePathString } from "expo-router";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, Home, LogOut, Share2, User, UserPlus } from "lucide-react-native";
import type { ReactNode } from "react";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useUpdateMember } from "@/hooks/use-member-profile";
import { useHouseholdDetail } from "@/hooks/use-households";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { mobileConfig } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StyledTextInput } from "@/components/ui/text-input";
import { ScreenHeader } from "@/components/features/screen-header";
import { colors, cyclingColors, cyclingTextColors, fontFamily, radius, spacing, typography } from "@/theme";

function getMemberInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase();
}

function getMemberColor(index: number): { bg: string; text: string } {
  const bg = cyclingColors[index % cyclingColors.length] ?? colors.muted;
  const text = cyclingTextColors[index % cyclingTextColors.length] ?? colors.text;
  return { bg, text };
}

interface SettingsRowProps {
  icon?: ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
  rightLabel?: string;
  last?: boolean;
}

function SettingsRow({ icon, label, subtitle, onPress, color, rightLabel, last }: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.settingsRow, !last && styles.settingsRowBorder]}
    >
      {icon ? <View style={styles.settingsRowIcon}>{icon}</View> : null}
      <View style={styles.settingsRowContent}>
        <Text style={[styles.settingsRowLabel, color ? { color } : undefined]}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={styles.settingsRowSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      <Text style={styles.settingsRowChevron}>{rightLabel ?? "›"}</Text>
    </Pressable>
  );
}

interface SectionCardProps {
  title: string;
  children: ReactNode;
}

function SectionCard({ title, children }: SectionCardProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <Card>
        <CardContent style={styles.sectionContent}>{children}</CardContent>
      </Card>
    </View>
  );
}

export default function SettingsScreen() {
  const { me, activeHouseholdId, setHouseholdId, hydrate, logout } = useMobileAuth();
  const updateMember = useUpdateMember();
  const householdQuery = useHouseholdDetail();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileName, setProfileName] = useState("");

  const myMember = me?.members.find((m) => m.householdId === activeHouseholdId) ?? me?.members[0];

  const handleOpenEdit = () => {
    setProfileName(myMember?.name ?? me?.name ?? "");
    setShowEditProfile(true);
  };

  const handleSaveProfile = () => {
    if (!myMember || !profileName.trim()) return;
    updateMember.mutate(
      { memberId: myMember.id, payload: { name: profileName.trim() } },
      {
        onSuccess: async () => {
          setShowEditProfile(false);
          await hydrate();
        },
        onError: (err) => {
          Alert.alert("Error", getMobileErrorMessage(err));
        },
      },
    );
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader />
      <ScrollView bounces={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Ajustes</Text>

        {/* Profile section */}
        <SectionCard title="PERFIL">
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {getMemberInitial(myMember?.name ?? me?.name ?? "?")}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {myMember?.name ?? me?.name ?? "—"}
              </Text>
              <Text style={styles.profileEmail}>{me?.email ?? ""}</Text>
            </View>
          </View>
          <View style={styles.settingsDivider} />
          <SettingsRow
            icon={<User size={16} color={colors.mutedForeground} />}
            label="Editar nombre"
            subtitle="Cambiá cómo aparecés en el hogar"
            onPress={handleOpenEdit}
          />
          <SettingsRow
            icon={<ChevronRight size={16} color={colors.mutedForeground} />}
            label="Mis preferencias de tareas"
            subtitle="Indicá qué tareas te gustan o evitás"
            onPress={() => router.push("/(app)/preferences" as RelativePathString)}
            last
          />
        </SectionCard>

        {/* Household section */}
        <SectionCard title="HOGAR ACTIVO">
          {me?.households.length ? (
            me.households.map((household, index) => {
              const isActive = household.id === activeHouseholdId;
              const memberColor = getMemberColor(index);
              return (
                <Pressable
                  key={household.id}
                  onPress={async () => {
                    await setHouseholdId(household.id);
                    await hydrate();
                  }}
                  style={[
                    styles.householdRow,
                    index < me.households.length - 1 && styles.settingsRowBorder,
                  ]}
                >
                  <View style={[styles.householdAvatar, { backgroundColor: memberColor.bg }]}>
                    <Home size={14} color={memberColor.text} />
                  </View>
                  <Text style={[styles.householdName, isActive && styles.householdNameActive]}>
                    {household.name}
                  </Text>
                  {isActive ? (
                    <Badge bgColor={colors.successBg} textColor={colors.successText}>
                      Activo
                    </Badge>
                  ) : null}
                </Pressable>
              );
            })
          ) : (
            <Text style={styles.emptyHouseholds}>Sin hogares activos.</Text>
          )}
          <View style={styles.settingsDivider} />
          <SettingsRow
            label="Unirme a otro hogar"
            onPress={() => router.push("/(auth)/join")}
            color={colors.successText}
            last
          />
        </SectionCard>

        {/* Invite section */}
        {householdQuery.data?.household?.inviteCode ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>INVITAR MIEMBROS</Text>
            <View style={styles.inviteCard}>
              <View style={styles.inviteHeader}>
                <UserPlus size={18} color={colors.primary} />
                <Text style={styles.inviteTitle}>Código de invitación</Text>
              </View>
              <Text style={styles.inviteCode}>
                {householdQuery.data.household.inviteCode}
              </Text>
              <Text style={styles.inviteHint}>
                Compartí este código para que se unan a tu hogar
              </Text>
              <Button
                onPress={() => {
                  const code = householdQuery.data?.household?.inviteCode;
                  const name = householdQuery.data?.household?.name ?? "mi hogar";
                  if (!code) return;
                  const baseUrl = mobileConfig.oauthBaseUrl;
                  const message = `Unite a "${name}" en Habita: ${baseUrl}/onboarding?mode=join\n\nCódigo: ${code}`;
                  void Share.share({ message });
                }}
                style={styles.inviteShareButton}
              >
                Compartir invitación
              </Button>
            </View>
          </View>
        ) : null}

        {/* Logout */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CUENTA</Text>
          <Button
            variant="destructive"
            onPress={() => void handleLogout()}
            style={styles.logoutButton}
          >
            <LogOut size={16} color="#ffffff" />
            Cerrar sesión
          </Button>
        </View>
      </ScrollView>

      <BottomSheet
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        title="Editar perfil"
      >
        <StyledTextInput
          label="Nombre"
          value={profileName}
          onChangeText={setProfileName}
          placeholder="Tu nombre"
          style={styles.editNameInput}
        />
        <Button
          onPress={handleSaveProfile}
          disabled={updateMember.isPending || !profileName.trim()}
          loading={updateMember.isPending}
          style={styles.editSaveButton}
        >
          Guardar
        </Button>
        <Button
          variant="ghost"
          onPress={() => setShowEditProfile(false)}
          style={styles.editCancelButton}
        >
          Cancelar
        </Button>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 24,
  },
  title: {
    ...typography.pageTitle,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: "700",
    color: colors.mutedForeground,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    paddingLeft: spacing.xs,
  },
  sectionContent: {
    padding: 0,
    paddingVertical: 0,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsRowIcon: {
    width: 20,
    alignItems: "center",
  },
  settingsRowContent: {
    flex: 1,
  },
  settingsRowLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    color: colors.text,
    fontWeight: "500",
  },
  settingsRowSubtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 1,
  },
  settingsRowChevron: {
    fontFamily: fontFamily.sans,
    color: colors.mutedForeground,
    fontSize: 18,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    fontFamily: fontFamily.sans,
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: fontFamily.sans,
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  profileEmail: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  householdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
  },
  householdAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  householdName: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
    flex: 1,
  },
  householdNameActive: {
    fontWeight: "700",
    color: colors.primary,
  },
  emptyHouseholds: {
    color: colors.mutedForeground,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  inviteCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
    padding: spacing.lg,
  },
  inviteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  inviteTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  inviteCode: {
    fontFamily: fontFamily.sans,
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  inviteHint: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  inviteShareButton: {
    width: "100%",
  },
  logoutButton: {
    width: "100%",
  },
  editNameInput: {
    marginBottom: spacing.lg,
  },
  editSaveButton: {
    marginBottom: spacing.sm,
  },
  editCancelButton: {
    marginBottom: spacing.sm,
  },
});
