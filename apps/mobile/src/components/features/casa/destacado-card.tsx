import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { radii as radius } from "@habita/design-tokens";
import { PLANES_LIST_PATH } from "@/lib/planes-logic";

import type { ThemeColors } from "@/theme";
import type { EventItem } from "@habita/contracts";

export interface DestacadoCardProps {
  event: EventItem;
}

function formatEventSubtitle(event: EventItem): string {
  const dateLabel = event.startDate
    ? new Date(event.startDate).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })
    : null;
  return [dateLabel, event.venueName].filter(Boolean).join(" · ") || "Evento cerca tuyo";
}

/** Casa "Destacado" card (§5.3) — at most one, pushes the event detail. */
export function DestacadoCard({ event }: DestacadoCardProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>DESTACADO</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={event.title}
        onPress={() => router.push({ pathname: "/(app)/casa/planes/[id]", params: { id: event.id } })}
        style={styles.card}
      >
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{formatEventSubtitle(event)}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver todos"
        hitSlop={8}
        onPress={() => router.push(PLANES_LIST_PATH)}
        style={styles.footerLink}
      >
        <Text style={styles.footerLinkText}>Ver todos</Text>
        <ChevronRight size={12} strokeWidth={1.75} color={colors.monte} />
      </Pressable>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.sm,
    },
    label: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 11,
      letterSpacing: 0.9,
      textTransform: "uppercase",
      color: c.ink3,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.card,
      padding: spacing.xl,
      gap: 4,
    },
    title: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 17,
      color: c.ink,
    },
    subtitle: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
    },
    footerLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      alignSelf: "flex-start",
    },
    footerLinkText: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 13,
      color: c.monte,
    },
  });
}
