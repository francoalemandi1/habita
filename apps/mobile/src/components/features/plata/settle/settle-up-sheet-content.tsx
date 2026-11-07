import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useReducedMotion } from "react-native-reanimated";
import { Banner, Button, Sheet, useSnackbar } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";
import { useBalances, useIsOnline, useSettleUp } from "@/hooks/use-money";
import { findMemberNet } from "@/lib/plata-money-saldos";
import { buildSettleRows, settleButtonLabel, settleConsequenceLine } from "@/lib/plata-money-settle";
import { SettleTransferRowView } from "./settle-transfer-row";
import { AnimatedAmount } from "./animated-amount";

import type { SettleUpSheetProps } from "../plata-view-props";
import type { SettlementTransfer } from "@habita/contracts";

const CONFIRMED_HOLD_MS = 400;

export function SettleUpSheetContent({
  visible,
  onClose,
  currentMemberId,
  currentMemberType,
}: SettleUpSheetProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { show } = useSnackbar();
  const { data: balances } = useBalances();
  const settleUp = useSettleUp(visible);
  const isOnline = useIsOnline();
  const reducedMotion = useReducedMotion();
  const [confirmedNet, setConfirmedNet] = useState<number | null>(null);

  const rows = useMemo(
    () => (balances ? buildSettleRows(balances.byCurrency, currentMemberId, currentMemberType) : []),
    [balances, currentMemberId, currentMemberType],
  );
  const recordableRows = rows.filter((row) => row.recordable);
  const currentNet = balances ? findMemberNet(balances.balances, currentMemberId) : 0;
  const primaryCurrency = balances?.primaryCurrency ?? "ARS";
  const consequence = settleConsequenceLine(rows, currentMemberId);

  async function handleConfirm() {
    const transfers: SettlementTransfer[] = recordableRows.map((row) => ({
      fromMemberId: row.transaction.fromMemberId,
      toMemberId: row.transaction.toMemberId,
      amount: row.transaction.amount,
      currency: row.currency,
    }));

    const result = await settleUp.mutateAsync({ transfers });
    const nextNet = findMemberNet(result.balances.balances, currentMemberId);
    setConfirmedNet(nextNet);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setTimeout(
      () => {
        onClose();
        setConfirmedNet(null);
        show({
          text: "Pagos registrados",
          actionLabel: "Ver",
          onAction: () => router.push("/(app)/plata?v=saldos"),
        });
      },
      reducedMotion ? 0 : CONFIRMED_HOLD_MS,
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Liquidar saldos">
      <View style={styles.content}>
        {!isOnline && <Banner tone="offline" text="Necesitás conexión para liquidar." />}

        {confirmedNet !== null ? (
          <View style={styles.confirmed}>
            <AnimatedAmount
              from={currentNet}
              to={confirmedNet}
              durationMs={reducedMotion ? 0 : CONFIRMED_HOLD_MS}
              style={styles.confirmedAmount}
            />
            {confirmedNet === 0 && <Text style={styles.confirmedNote}>Están al día</Text>}
          </View>
        ) : rows.length === 0 ? (
          <Text style={styles.settled}>Están al día</Text>
        ) : (
          <>
            <View>
              {rows.map((row) => (
                <SettleTransferRowView
                  key={`${row.currency}-${row.transaction.fromMemberId}-${row.transaction.toMemberId}`}
                  row={row}
                  currentMemberId={currentMemberId}
                  primaryCurrency={primaryCurrency}
                />
              ))}
            </View>

            {consequence && <Text style={styles.consequence}>{consequence}</Text>}

            {settleUp.isError && <Text style={styles.error}>No se pudo registrar. Probá de nuevo.</Text>}

            {recordableRows.length > 0 && (
              <Button
                label={isOnline ? settleButtonLabel(recordableRows.length) : "Necesitás conexión"}
                loadingLabel="Liquidando"
                loading={settleUp.isPending}
                disabled={!isOnline || settleUp.isPending}
                onPress={handleConfirm}
              />
            )}
          </>
        )}
      </View>
    </Sheet>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: {
      gap: spacing.lg,
    },
    confirmed: {
      paddingVertical: spacing.xxl,
      alignItems: "center",
    },
    confirmedAmount: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 32,
      color: c.ink,
    },
    confirmedNote: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink2,
      marginTop: 4,
    },
    settled: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink2,
      textAlign: "center",
      paddingVertical: spacing.xl,
    },
    consequence: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
    error: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ladrilloText,
    },
  });
}
