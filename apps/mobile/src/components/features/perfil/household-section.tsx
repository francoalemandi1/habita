import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { UserPlus } from "lucide-react-native";
import { ListRow } from "@/components/ds";
import { MemberRow } from "./member-row";
import { HouseholdSettingsRows } from "./household-settings-rows";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { MemberSummary } from "@habita/contracts";

export interface HouseholdSectionProps {
  householdName: string;
  members: MemberSummary[];
  currentMemberId: string | undefined;
  onInvitePress: () => void;
  household: unknown;
  onboardingProfile: unknown;
}

/** §5.3 Perfil — household name, members with their role, Invitar, and the kept household settings. */
export function HouseholdSection({
  householdName,
  members,
  currentMemberId,
  onInvitePress,
  household,
  onboardingProfile,
}: HouseholdSectionProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{householdName.toUpperCase()}</Text>
      {members.map((member) => (
        <MemberRow key={member.id} member={member} isCurrentUser={member.id === currentMemberId} />
      ))}
      <ListRow icon={UserPlus} title="Invitar" onPress={onInvitePress} />
      <HouseholdSettingsRows household={household} onboardingProfile={onboardingProfile} />
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      marginTop: spacing.lg,
    },
    sectionLabel: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 11,
      letterSpacing: 0.8,
      color: c.ink2,
      marginBottom: spacing.xs,
    },
  });
}
