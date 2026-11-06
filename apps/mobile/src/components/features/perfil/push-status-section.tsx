import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Banner, Button } from "@/components/ds";
import { getPushPermissionStatus, registerForPushNotifications } from "@/lib/push-notifications";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { PushPermissionStatus } from "@/lib/avisos-push-sheet";

/** §5.3 Configuración de avisos — push status banner, moved from the legacy screen. */
export function PushStatusSection(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [status, setStatus] = useState<PushPermissionStatus | null>(null);

  useEffect(() => {
    void getPushPermissionStatus().then(setStatus);
  }, []);

  const handleActivate = () => {
    void registerForPushNotifications().then((granted) => {
      setStatus(granted ? "granted" : "denied");
    });
  };

  if (status === null) return <></>;

  if (status === "granted") {
    return <Banner tone="info" text="Notificaciones push activadas" />;
  }

  return (
    <View style={styles.section}>
      <Banner tone="attention" text="Notificaciones push desactivadas" />
      {status === "undetermined" ? (
        <Button label="Activar notificaciones" onPress={handleActivate} style={styles.button} />
      ) : (
        <Pressable onPress={() => void Linking.openSettings()}>
          <Text style={styles.link}>Activar en Ajustes del dispositivo</Text>
        </Pressable>
      )}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      gap: spacing.sm,
    },
    button: {
      marginTop: spacing.xs,
    },
    link: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 13,
      color: c.monte,
    },
  });
}
