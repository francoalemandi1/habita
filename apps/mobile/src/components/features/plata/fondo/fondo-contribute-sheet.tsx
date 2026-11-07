import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Banner, Button, Sheet, TextField, useSnackbar } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";
import { useIsOnline } from "@/hooks/use-money";
import { formatCurrencyArs } from "@/lib/plata-money-saldos";
import { isValidContributionAmount, suggestedContributionAmount } from "@/lib/plata-money-fondo";

import type { CreateContributionPayload, MemberContributionStatus } from "@habita/contracts";

interface FondoContributeSheetProps {
  visible: boolean;
  onClose: () => void;
  currentMemberStatus: MemberContributionStatus | undefined;
  onContribute: (payload: CreateContributionPayload) => Promise<unknown>;
}

/** §7 pattern C "Aportar al fondo" — amount prefilled with the pending quota, editable. */
export function FondoContributeSheet({
  visible,
  onClose,
  currentMemberStatus,
  onContribute,
}: FondoContributeSheetProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { show } = useSnackbar();
  const isOnline = useIsOnline();
  const [amount, setAmount] = useState(() => String(suggestedContributionAmount(currentMemberStatus)));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount(String(suggestedContributionAmount(currentMemberStatus)));
      setError(null);
    }
  }, [visible, currentMemberStatus]);

  const parsedAmount = Number(amount);
  const isValid = isValidContributionAmount(parsedAmount);

  async function handleSubmit() {
    if (!isValid) {
      setError("Ingresá un monto mayor a $0.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onContribute({ amount: parsedAmount });
      onClose();
      show({
        text: "Aporte registrado",
        actionLabel: "Ver",
        onAction: () => router.push("/(app)/plata?v=fondo"),
      });
    } catch {
      setError("No se pudo registrar. Probá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Aportar al fondo">
      <View style={styles.content}>
        {!isOnline && <Banner tone="offline" text="Necesitás conexión para aportar." />}

        <TextField label="Monto" keyboardType="numeric" value={amount} onChangeText={setAmount} />

        <Text style={styles.note}>Queda registrado en el fondo de la casa</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button
          label={isOnline ? `Aportar ${formatCurrencyArs(isValid ? parsedAmount : 0)}` : "Necesitás conexión"}
          loadingLabel="Aportando"
          loading={isSubmitting}
          disabled={!isOnline || isSubmitting}
          onPress={handleSubmit}
        />
      </View>
    </Sheet>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: {
      gap: spacing.lg,
    },
    note: {
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
