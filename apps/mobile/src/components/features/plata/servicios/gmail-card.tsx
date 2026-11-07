import { useMemo } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Mail } from "lucide-react-native";
import { ApiError } from "@habita/api-client";
import { Button } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { radii as radius } from "@habita/design-tokens";
import { useScanGmail } from "@/hooks/use-services";
import { gmailStatusText } from "@/lib/plata-servicios-logic";
import { mobileConfig } from "@/lib/config";

import type { ThemeColors } from "@/theme";
import type { GmailScanResult } from "@/hooks/use-services";

interface GmailCardProps {
  onScanned: (result: GmailScanResult) => void;
}

/** §5.3 "Servicios" — "Gmail conectado · revisado hoy 7:00" / connect CTA. */
export function GmailCard({ onScanned }: GmailCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scan = useScanGmail();
  const isNotConnected = scan.isError && scan.error instanceof ApiError && scan.error.code === "GMAIL_NOT_CONNECTED";

  async function handleScan(): Promise<void> {
    try {
      const result = await scan.mutateAsync();
      onScanned(result);
    } catch (error) {
      if (error instanceof ApiError && error.code === "GMAIL_NOT_CONNECTED") {
        await Linking.openURL(`${mobileConfig.apiBaseUrl}/api/gmail/authorize`);
      }
    }
  }

  const statusText = scan.isSuccess
    ? gmailStatusText({ connected: true, lastScanAt: new Date().toISOString() }, new Date())
    : isNotConnected
      ? gmailStatusText({ connected: false, lastScanAt: null }, new Date())
      : "Revisá tu Gmail para detectar facturas";

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <Mail size={18} strokeWidth={1.75} color={colors.ink} />
        </View>
        <View style={styles.textColumn}>
          <Text style={styles.statusText}>{statusText}</Text>
          {scan.isError && !isNotConnected && <Text style={styles.errorText}>No se pudo revisar Gmail</Text>}
        </View>
      </View>
      <Button
        label={isNotConnected ? "Conectar Gmail" : "Revisar"}
        variant="secondary"
        size="sm"
        loading={scan.isPending}
        loadingLabel="Revisando"
        onPress={() => void handleScan()}
      />
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.card,
      padding: spacing.md,
    },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: radius.rowIcon,
      backgroundColor: c.paper,
      alignItems: "center",
      justifyContent: "center",
    },
    textColumn: { flex: 1, gap: 2 },
    statusText: { fontFamily: fontFamilyForWeight(500), fontSize: 15, color: c.ink },
    errorText: { fontFamily: fontFamilyForWeight(400), fontSize: 13, color: c.ladrilloText },
  });
}
