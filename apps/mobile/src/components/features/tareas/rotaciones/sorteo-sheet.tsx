import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Avatar, Banner, Button, Sheet } from "@/components/ds";
import { useIsOnline } from "@/hooks/use-is-online";
import { useRouletteAssign } from "@/hooks/use-roulette";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { pickSorteoWinner, resolveSorteoAvatarStyle } from "@/lib/tareas-sorteo";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

interface SorteoSheetProps {
  visible: boolean;
  members: Array<{ id: string; name: string }>;
  taskId: string;
  onClose: () => void;
}

/** Sorteo sheet (handoff §5.3/§8.3): winner settles to 72px, the rest dim to 35% opacity, no spinning wheel. */
export function SorteoSheet({ visible, members, taskId, onClose }: SorteoSheetProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const assignM = useRouletteAssign();
  const isOnline = useIsOnline();
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClose(): void {
    setWinnerId(null);
    setError(null);
    onClose();
  }

  function handleDraw(): void {
    setError(null);
    const winner = pickSorteoWinner(members.map((m) => m.id));
    setWinnerId(winner);
  }

  async function handleAssign(): Promise<void> {
    if (!winnerId) return;
    try {
      await assignM.mutateAsync({ memberId: winnerId, taskId });
      handleClose();
    } catch (err) {
      setError(getMobileErrorMessage(err));
    }
  }

  const winnerName = members.find((m) => m.id === winnerId)?.name ?? null;

  return (
    <Sheet visible={visible} onClose={handleClose} title="Sortear una tarea">
      <View style={styles.body}>
        <View style={styles.avatarRow}>
          {members.map((member) => {
            const style = resolveSorteoAvatarStyle(member.id, winnerId);
            return (
              <Avatar
                key={member.id}
                name={member.name}
                size={56}
                style={{ opacity: style.opacity, transform: [{ scale: style.size / 56 }] }}
              />
            );
          })}
        </View>
        {winnerName ? (
          <View style={styles.resultBanner}>
            <Text style={styles.resultText}>{winnerName === "Vos" ? "Te toca a vos" : `Le toca a ${winnerName}`}</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {winnerId && !isOnline ? <Banner tone="offline" text="Necesitás conexión" /> : null}
        {winnerId ? (
          <View style={styles.actions}>
            <Button label="Otra vez" variant="secondary" onPress={handleDraw} style={styles.actionButton} />
            <Button
              label={`Asignar a ${winnerName ?? ""}`}
              onPress={() => void handleAssign()}
              loading={assignM.isPending}
              disabled={!isOnline || assignM.isPending}
              style={styles.actionButton}
            />
          </View>
        ) : (
          <Button label="Sortear" onPress={handleDraw} disabled={members.length === 0} />
        )}
      </View>
    </Sheet>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    body: {
      gap: spacing.lg,
      paddingBottom: spacing.lg,
    },
    avatarRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.xl,
      paddingVertical: spacing.lg,
    },
    resultBanner: {
      backgroundColor: c.mantecaSoft,
      borderRadius: 14,
      padding: spacing.md,
      alignItems: "center",
    },
    resultText: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 16,
      color: c.mantecaText,
    },
    error: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 13,
      color: c.ladrilloText,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    actionButton: {
      flex: 1,
    },
  });
}
