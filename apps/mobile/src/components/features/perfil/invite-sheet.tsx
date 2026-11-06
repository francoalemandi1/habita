import { useMemo } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { Button, Sheet } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { mobileConfig } from "@/lib/config";

import type { ThemeColors } from "@/theme";

export interface InviteSheetProps {
  visible: boolean;
  onClose: () => void;
  householdName: string;
  inviteCode: string;
}

/** §5.3 Perfil — Invitar row opens this sheet with the code and a native Share. */
export function InviteSheet({ visible, onClose, householdName, inviteCode }: InviteSheetProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleShare = () => {
    const message = `Unite a "${householdName}" en Habita: ${mobileConfig.oauthBaseUrl}/onboarding?mode=join\n\nCódigo: ${inviteCode}`;
    void Share.share({ message });
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Invitar">
      <View style={styles.body}>
        <Text style={styles.code}>{inviteCode}</Text>
        <Text style={styles.hint}>Compartí este código para que se unan a {householdName}.</Text>
        <Button label="Compartir invitación" onPress={handleShare} style={styles.button} />
      </View>
    </Sheet>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    body: {
      gap: spacing.md,
      paddingBottom: spacing.lg,
      alignItems: "center",
    },
    code: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 32,
      letterSpacing: 4,
      color: c.ink,
    },
    hint: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 14,
      color: c.ink2,
      textAlign: "center",
    },
    button: {
      width: "100%",
      marginTop: spacing.sm,
    },
  });
}
