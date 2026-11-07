import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Banner, Button, Chip, Skeleton } from "@/components/ds";
import { usePreferences, useRemovePreference, useSetPreference } from "@/hooks/use-preferences";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { MemberPreference, PreferenceValue } from "@/hooks/use-preferences";

const FREQ_LABELS: Record<string, string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
  ONCE: "Una vez",
};

interface PreferenceTaskRowProps {
  pref: MemberPreference;
  onSet: (taskId: string, value: PreferenceValue) => void;
  onRemove: (taskId: string) => void;
}

function PreferenceTaskRow({ pref, onSet, onRemove }: PreferenceTaskRowProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPreferred = pref.preference === "PREFERRED";
  const isDisliked = pref.preference === "DISLIKED";

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{pref.task.name}</Text>
        <Text style={styles.meta}>{FREQ_LABELS[pref.task.frequency] ?? pref.task.frequency}</Text>
      </View>
      <View style={styles.actions}>
        <Chip
          label="Prefiero"
          tone={isPreferred ? "onDay" : "filterOff"}
          onPress={() => (isPreferred ? onRemove(pref.taskId) : onSet(pref.taskId, "PREFERRED"))}
        />
        <Chip
          label="Evito"
          tone={isDisliked ? "dueToday" : "filterOff"}
          onPress={() => (isDisliked ? onRemove(pref.taskId) : onSet(pref.taskId, "DISLIKED"))}
        />
      </View>
    </View>
  );
}

/** §5.3 Disponibilidad — preferencias Sí/No, moved from the legacy Preferencias screen. */
export function PreferenciasList(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const prefsQuery = usePreferences();
  const setPref = useSetPreference();
  const removePref = useRemovePreference();

  if (prefsQuery.isLoading) {
    return <Skeleton height={80} />;
  }

  if (prefsQuery.isError) {
    return (
      <View style={styles.list}>
        <Banner tone="attention" text="No pudimos cargar las preferencias." />
        <Button label="Reintentar" variant="link" onPress={() => void prefsQuery.refetch()} />
      </View>
    );
  }

  const items = [...(prefsQuery.data?.preferred ?? []), ...(prefsQuery.data?.disliked ?? [])];

  if (items.length === 0) {
    return <Text style={styles.empty}>Marcá qué tareas preferís o evitás desde el detalle de cada tarea.</Text>;
  }

  return (
    <View style={styles.list}>
      {items.map((pref) => (
        <PreferenceTaskRow
          key={pref.id}
          pref={pref}
          onSet={(taskId, value) => setPref.mutate({ taskId, preference: value })}
          onRemove={(taskId) => removePref.mutate(taskId)}
        />
      ))}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    list: {
      gap: spacing.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.lineSoft,
    },
    info: {
      flex: 1,
    },
    name: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 14,
      color: c.ink,
    },
    meta: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 12,
      color: c.ink2,
      marginTop: 1,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    empty: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
  });
}
