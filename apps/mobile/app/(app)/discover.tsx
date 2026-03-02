import { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useEvents } from "@/hooks/use-events";
import { usePromos, useRefreshPromos, usePromoPipelineStatus, parseJsonArray } from "@/hooks/use-promos";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { semanticColors } from "@habita/design-tokens";

import type { EventItem, EventCategory } from "@/hooks/use-events";
import type { BankPromo } from "@/hooks/use-promos";

// ── Category config ─────────────────────────────────────────────────────────

const EVENT_CATEGORY_LABELS: Partial<Record<EventCategory, string>> = {
  TEATRO: "Teatro",
  MUSICA: "Música",
  CINE: "Cine",
  EXPOSICIONES: "Expo",
  FESTIVALES: "Festival",
  GASTRONOMIA: "Gastro",
  INFANTIL: "Niños",
  MERCADOS: "Mercados",
  PASEOS: "Paseos",
};

const CATEGORY_EMOJIS: Partial<Record<EventCategory, string>> = {
  TEATRO: "🎭",
  MUSICA: "🎵",
  CINE: "🎬",
  EXPOSICIONES: "🖼",
  FESTIVALES: "🎪",
  GASTRONOMIA: "🍽",
  INFANTIL: "🧸",
  MERCADOS: "🛍",
  PASEOS: "🌿",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatEventDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

function formatPrice(min: number | null, max: number | null): string {
  if (min === null && max === null) return "";
  if (min === 0 && (max === null || max === 0)) return "Gratis";
  if (min !== null && min > 0) return `$${min.toLocaleString("es-AR", { maximumFractionDigits: 0 })}+`;
  return "";
}

// ── Event Card ──────────────────────────────────────────────────────────────

function EventCard({ event }: { event: EventItem }) {
  const handlePress = () => {
    const url = event.ticketUrl ?? event.sourceUrl;
    if (url) void Linking.openURL(url);
  };

  const priceLabel = formatPrice(event.priceMin, event.priceMax);
  const emoji = CATEGORY_EMOJIS[event.category] ?? "📅";

  return (
    <Pressable
      onPress={handlePress}
      style={{
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        backgroundColor: "#fff",
      }}
    >
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: "#f3f4f6",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "700", color: "#111", fontSize: 14 }} numberOfLines={2}>
            {event.title}
          </Text>
          {event.editorialHighlight ? (
            <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 3 }} numberOfLines={2}>
              {event.editorialHighlight}
            </Text>
          ) : event.description ? (
            <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 3 }} numberOfLines={2}>
              {event.description}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            {event.startDate && (
              <Text style={{ fontSize: 11, color: "#6b7280" }}>
                📅 {formatEventDate(event.startDate)}
              </Text>
            )}
            {event.venueName && (
              <Text style={{ fontSize: 11, color: "#6b7280" }} numberOfLines={1}>
                📍 {event.venueName}
              </Text>
            )}
            {priceLabel ? (
              <View
                style={{
                  backgroundColor: priceLabel === "Gratis" ? "#dcfce7" : "#f0f9ff",
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 11, color: priceLabel === "Gratis" ? "#16a34a" : "#0369a1", fontWeight: "600" }}>
                  {priceLabel}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ── Promo Card ──────────────────────────────────────────────────────────────

function PromoCard({ promo }: { promo: BankPromo }) {
  const days = parseJsonArray(promo.daysOfWeek);
  const methods = parseJsonArray(promo.paymentMethods);
  const plans = parseJsonArray(promo.eligiblePlans);

  const handlePress = () => {
    if (promo.sourceUrl) void Linking.openURL(promo.sourceUrl);
  };

  return (
    <Pressable
      onPress={promo.sourceUrl ? handlePress : undefined}
      style={{
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        backgroundColor: "#fff",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Text style={{ fontWeight: "700", color: "#111", fontSize: 14 }}>
              {promo.storeName}
            </Text>
            <Text style={{ fontSize: 11, color: "#6b7280" }}>· {promo.bankDisplayName}</Text>
          </View>
          {promo.title && (
            <Text style={{ color: "#6b7280", fontSize: 12 }} numberOfLines={2}>
              {promo.title}
            </Text>
          )}
          <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            {days.length > 0 && (
              <View style={{ backgroundColor: "#f0f9ff", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, color: "#0369a1", fontWeight: "500" }}>
                  {days.join(" · ")}
                </Text>
              </View>
            )}
            {methods.slice(0, 2).map((m) => (
              <View key={m} style={{ backgroundColor: "#f5f3ff", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, color: "#7c3aed", fontWeight: "500" }}>{m}</Text>
              </View>
            ))}
            {plans.length > 0 && (
              <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                {plans.slice(0, 2).join(", ")}
              </Text>
            )}
            {promo.capAmount && promo.capAmount > 0 ? (
              <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                Tope ${promo.capAmount.toLocaleString("es-AR")}
              </Text>
            ) : null}
          </View>
        </View>
        <View
          style={{
            backgroundColor: "#dcfce7",
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginLeft: 10,
          }}
        >
          <Text style={{ color: "#16a34a", fontWeight: "800", fontSize: 18 }}>
            {promo.discountPercent}%
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── Events Tab ──────────────────────────────────────────────────────────────

function EventsTab() {
  const [city, setCity] = useState("Buenos Aires");
  const [cityInput, setCityInput] = useState("Buenos Aires");
  const [activeCategory, setActiveCategory] = useState<EventCategory | undefined>();

  const eventsQuery = useEvents({ city, category: activeCategory, limit: 30 });
  const events = eventsQuery.data?.events ?? [];

  const handleCitySearch = () => {
    const trimmed = cityInput.trim();
    if (trimmed) setCity(trimmed);
  };

  return (
    <>
      {/* City search */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <TextInput
          value={cityInput}
          onChangeText={setCityInput}
          onSubmitEditing={handleCitySearch}
          placeholder="Ciudad..."
          returnKeyType="search"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 10,
            padding: 10,
            fontSize: 14,
          }}
        />
        <Pressable
          onPress={handleCitySearch}
          style={{
            backgroundColor: semanticColors.primary,
            borderRadius: 10,
            paddingHorizontal: 14,
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Buscar</Text>
        </Pressable>
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 10 }}
        contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
      >
        <Pressable
          onPress={() => setActiveCategory(undefined)}
          style={{
            backgroundColor: !activeCategory ? semanticColors.primary : "#f3f4f6",
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 6,
          }}
        >
          <Text style={{ color: !activeCategory ? "#fff" : "#374151", fontSize: 13, fontWeight: "600" }}>
            Todos
          </Text>
        </Pressable>
        {(Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]).map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setActiveCategory(activeCategory === cat ? undefined : cat)}
            style={{
              backgroundColor: activeCategory === cat ? semanticColors.primary : "#f3f4f6",
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: activeCategory === cat ? "#fff" : "#374151", fontSize: 13, fontWeight: "500" }}>
              {CATEGORY_EMOJIS[cat]} {EVENT_CATEGORY_LABELS[cat]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Events list */}
      {eventsQuery.isLoading && (
        <Text style={{ marginTop: 24, color: "#6b7280", textAlign: "center" }}>
          Buscando eventos en {city}...
        </Text>
      )}

      {eventsQuery.isError && (
        <Text style={{ marginTop: 24, color: "#b91c1c" }}>
          {getMobileErrorMessage(eventsQuery.error)}
        </Text>
      )}

      {!eventsQuery.isLoading && events.length === 0 && !eventsQuery.isError && (
        <View style={{ marginTop: 30, alignItems: "center" }}>
          <Text style={{ fontSize: 36, marginBottom: 10 }}>📭</Text>
          <Text style={{ color: "#6b7280", textAlign: "center" }}>
            No encontramos eventos en {city}.{"\n"}
            Probá con otra ciudad o categoría.
          </Text>
        </View>
      )}

      <View style={{ marginTop: 12 }}>
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </View>
    </>
  );
}

// ── Promos Tab ──────────────────────────────────────────────────────────────

function PromosTab() {
  const promosQuery = usePromos();
  const pipelineStatus = usePromoPipelineStatus();
  const refreshM = useRefreshPromos();

  const promos = promosQuery.data ?? [];
  const isRunning = pipelineStatus.data?.isRunning ?? false;

  // Group by store
  const byStore = promos.reduce<Record<string, BankPromo[]>>((acc, p) => {
    const key = p.storeName;
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(p);
    return acc;
  }, {});

  const sortedStores = Object.keys(byStore).sort();

  const handleRefresh = () => {
    refreshM.mutate(undefined, {
      onError: (error) => Alert.alert("Error", getMobileErrorMessage(error)),
    });
  };

  return (
    <>
      {/* Status bar */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        <Text style={{ color: "#6b7280", fontSize: 13 }}>
          {promos.length} promos disponibles
        </Text>
        <Pressable
          onPress={handleRefresh}
          disabled={isRunning || refreshM.isPending}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "#f3f4f6",
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ fontSize: 13, color: isRunning ? "#9ca3af" : "#374151", fontWeight: "500" }}>
            {isRunning ? "Actualizando..." : "Actualizar"}
          </Text>
        </Pressable>
      </View>

      {isRunning && (
        <View style={{ backgroundColor: "#eff6ff", borderRadius: 10, padding: 10, marginTop: 10 }}>
          <Text style={{ color: "#1d4ed8", fontSize: 13 }}>
            Buscando promociones vigentes... esto puede tomar unos segundos.
          </Text>
        </View>
      )}

      {promosQuery.isLoading && (
        <Text style={{ marginTop: 24, color: "#6b7280", textAlign: "center" }}>
          Cargando promos...
        </Text>
      )}

      {promosQuery.isError && (
        <Text style={{ marginTop: 24, color: "#b91c1c" }}>
          {getMobileErrorMessage(promosQuery.error)}
        </Text>
      )}

      {!promosQuery.isLoading && promos.length === 0 && !promosQuery.isError && (
        <View style={{ marginTop: 30, alignItems: "center" }}>
          <Text style={{ fontSize: 36, marginBottom: 10 }}>🏦</Text>
          <Text style={{ color: "#6b7280", textAlign: "center" }}>
            No hay promos cargadas aún.{"\n"}
            Tocá "Actualizar" para buscar las vigentes.
          </Text>
        </View>
      )}

      {sortedStores.map((store) => (
        <View key={store} style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: "700", color: "#111", fontSize: 15, marginBottom: 8 }}>
            {store}
          </Text>
          {(byStore[store] ?? []).map((promo) => (
            <PromoCard key={promo.id} promo={promo} />
          ))}
        </View>
      ))}
    </>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

type Tab = "events" | "promos";

export default function DiscoverScreen() {
  const [tab, setTab] = useState<Tab>("events");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", padding: 20 }}>
      {/* Header */}
      <Text style={{ fontSize: 20, fontWeight: "700", color: "#111" }}>Descubrí</Text>
      <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>
        Eventos y promos bancarias
      </Text>

      {/* Tab switcher */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#f3f4f6",
          borderRadius: 12,
          padding: 4,
          marginTop: 14,
        }}
      >
        {(["events", "promos"] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={{
              flex: 1,
              backgroundColor: tab === t ? "#fff" : "transparent",
              borderRadius: 9,
              paddingVertical: 8,
              alignItems: "center",
              shadowColor: tab === t ? "#000" : "transparent",
              shadowOpacity: tab === t ? 0.06 : 0,
              shadowRadius: tab === t ? 4 : 0,
              elevation: tab === t ? 2 : 0,
            }}
          >
            <Text
              style={{
                fontWeight: "600",
                fontSize: 14,
                color: tab === t ? "#111" : "#6b7280",
              }}
            >
              {t === "events" ? "🎭 Eventos" : "💳 Promos"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {tab === "events" ? <EventsTab /> : <PromosTab />}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
