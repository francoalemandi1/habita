import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Compass } from "lucide-react-native";
import { Banner, Button, EmptyState, Skeleton } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { SalidasRow } from "@/components/features/planes/salidas-row";

import type { ThemeColors } from "@/theme";
import type { SalidaGroupState } from "@/lib/planes-salidas-logic";
import type { RelaxEvent } from "@/hooks/use-relax-suggestions";

export interface SalidasGroupProps {
  title: string;
  /** "missing-city" is handled one level up, by the panel — never rendered here. */
  state: SalidaGroupState;
  events: RelaxEvent[];
  emptyDescription: string;
  onRetry: () => void;
}

/** One Salidas group ("Actividades" or "Restaurantes") — handles its own loading/error/empty state. */
export function SalidasGroup({ title, state, events, emptyDescription, onRetry }: SalidasGroupProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {state === "loading" ? (
        <View style={styles.skeletonList}>
          <Skeleton height={60} />
          <Skeleton height={60} />
          <Skeleton height={60} />
        </View>
      ) : null}

      {state === "ai-disabled" ? <Text style={styles.calmText}>Hoy no podemos sugerir esto.</Text> : null}

      {state === "error" ? (
        <View style={styles.errorBlock}>
          <Banner tone="attention" text={`No pudimos cargar ${title.toLowerCase()}.`} />
          <Button label="Reintentar" variant="link" onPress={onRetry} />
        </View>
      ) : null}

      {state === "empty" ? <EmptyState icon={Compass} title="Sin resultados" description={emptyDescription} /> : null}

      {state === "ready"
        ? events.map((event, index) => <SalidasRow key={event.id ?? `${title}-${index}`} event={event} />)
        : null}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.sm,
    },
    title: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 13,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      color: c.ink2,
    },
    skeletonList: {
      gap: spacing.sm,
    },
    calmText: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 14,
      color: c.ink2,
    },
    errorBlock: {
      gap: spacing.sm,
      alignItems: "flex-start",
    },
  });
}
