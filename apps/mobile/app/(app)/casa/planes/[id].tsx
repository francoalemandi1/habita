import { useMemo } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, MapPin } from "lucide-react-native";
import { Button, ScreenHeader } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { useEvents } from "@/hooks/use-events";
import { useSavedEvents, useToggleSaveEvent, isEventSaved } from "@/hooks/use-saved-events";
import { formatEventPriceLabel, toEventSaveInput } from "@/lib/casa-event";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

const EVENTS_LIST_LIMIT = 20;

function formatEventDate(iso: string | null): string {
  if (!iso) return "Fecha a confirmar";
  return new Date(iso).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

/** Casa "Evento" detail (§5.3) — level 1, pushed from the Destacado card. */
export default function PlanDetailScreen(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();

  // Same params as the Casa board's destacado query — served from cache, no extra fetch.
  const eventsQuery = useEvents({ limit: EVENTS_LIST_LIMIT });
  const savedEventsQuery = useSavedEvents();
  const { toggle, isPending } = useToggleSaveEvent();

  const event = eventsQuery.data?.events.find((item) => item.id === id) ?? null;
  const saved = isEventSaved(savedEventsQuery.data, event?.id);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader variant="detail" title={event?.title ?? "Plan"} backLabel="Casa" onBack={() => router.back()} />
      {!event ? (
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>No encontramos este plan</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {event.imageUrl ? <Image source={{ uri: event.imageUrl }} alt={event.title} style={styles.image} /> : null}

          <Text style={styles.title}>{event.title}</Text>

          <View style={styles.metaRow}>
            <Calendar size={16} strokeWidth={1.75} color={colors.ink2} />
            <Text style={styles.metaText}>{formatEventDate(event.startDate)}</Text>
          </View>
          {event.venueName ? (
            <View style={styles.metaRow}>
              <MapPin size={16} strokeWidth={1.75} color={colors.ink2} />
              <Text style={styles.metaText} numberOfLines={1}>{event.venueName}</Text>
            </View>
          ) : null}
          <Text style={styles.price}>{formatEventPriceLabel(event.priceMin, event.priceMax)}</Text>

          {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

          <Button
            label={saved ? "Guardado" : "Guardar"}
            variant={saved ? "secondary" : "primary"}
            disabled={isPending}
            onPress={() => {
              if (saved) {
                void toggle({ savedEventId: saved.id });
              } else {
                void toggle({ input: toEventSaveInput(event) });
              }
            }}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.paper,
    },
    content: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 32,
      gap: spacing.sm,
    },
    image: {
      width: "100%",
      height: 240,
      borderRadius: 20,
      marginBottom: spacing.md,
      backgroundColor: c.sand,
    },
    title: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 22,
      color: c.ink,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    metaText: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink2,
      flex: 1,
    },
    price: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 15,
      color: c.ink,
    },
    description: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink,
      lineHeight: 22,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    notFound: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
    },
    notFoundText: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 15,
      color: c.ink2,
    },
  });
}
