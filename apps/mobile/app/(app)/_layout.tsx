import { Redirect, Tabs } from "expo-router";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";
import { fontFamilyForWeight } from "@/theme";
import { useThemeColors } from "@/hooks/use-theme";
import { House, ListChecks, Plus, ShoppingBasket, Wallet } from "lucide-react-native";

import { AiJobWatcher } from "@/components/ai-job-watcher";
import { AnotarSheet } from "@/components/features/anotar-sheet";
import { openAnotar } from "@/lib/anotar-store";

import type { LucideIcon } from "lucide-react-native";
import type { ThemeColors } from "@/theme";

// ─── Custom tab bar — 4 fixed places + central Anotar button ────────────────
// §5.1 / §06 Navegación: the tabs never appear or disappear.

const TAB_CONFIG: Record<string, { Icon: LucideIcon; label: string }> = {
  casa: { Icon: House, label: "Casa" },
  tareas: { Icon: ListChecks, label: "Tareas" },
  plata: { Icon: Wallet, label: "Plata" },
  super: { Icon: ShoppingBasket, label: "Súper" },
};

const TAB_ORDER = ["casa", "tareas", "plata", "super"];

/** Minimal type for the tab bar props we need — avoids importing @react-navigation/bottom-tabs. */
interface TabBarProps {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  descriptors: Record<string, { options?: { href?: string | null } } | undefined>;
  navigation: {
    emit: (event: { type: string; target: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

function CustomTabBar({ state, descriptors, navigation, onAnotarPress }: TabBarProps & { onAnotarPress: () => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const routesByName = new Map(state.routes.map((route) => [route.name, route]));
  const orderedTabs = TAB_ORDER.map((name) => routesByName.get(name)).filter(
    (route): route is TabBarProps["state"]["routes"][number] => route != null,
  );
  const firstHalf = orderedTabs.slice(0, 2);
  const secondHalf = orderedTabs.slice(2);

  const renderTab = (route: TabBarProps["state"]["routes"][number]) => {
    const config = TAB_CONFIG[route.name];
    if (!config) return null;

    const options = descriptors[route.key]?.options;
    if (options?.href === null) return null;

    const focused = state.index === state.routes.indexOf(route);
    const { Icon, label } = config;

    const onPress = () => {
      const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <Pressable key={route.key} onPress={onPress} style={styles.tabItem} accessibilityRole="button" accessibilityLabel={label}>
        <Icon size={22} strokeWidth={1.75} color={focused ? colors.monte : colors.ink3} />
        <Text style={[styles.tabLabel, { color: focused ? colors.monte : colors.ink3 }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {firstHalf.map(renderTab)}
        <Pressable
          onPress={onAnotarPress}
          style={styles.anotarButton}
          accessibilityRole="button"
          accessibilityLabel="Anotar"
        >
          <Plus size={24} strokeWidth={1.75} color={colors.paper} />
        </Pressable>
        {secondHalf.map(renderTab)}
      </View>
    </View>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function AppLayout() {
  const { isAuthenticated, isBootstrapping, me } = useMobileAuth();

  if (!isBootstrapping && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!isBootstrapping && isAuthenticated && me && !me.hasMembership) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return (
    <>
      <AiJobWatcher />
      <Tabs
        tabBar={(props) => (
          <CustomTabBar {...(props as unknown as TabBarProps)} onAnotarPress={() => openAnotar()} />
        )}
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* ── Tabs (visible in tab bar) — never shown or hidden conditionally ── */}
        <Tabs.Screen name="casa" options={{ title: "Casa" }} />
        <Tabs.Screen name="tareas" options={{ title: "Tareas" }} />
        <Tabs.Screen name="plata" options={{ title: "Plata" }} />
        <Tabs.Screen name="super" options={{ title: "Súper" }} />

        {/* Profile — hidden from tab bar, accessible via ScreenHeader avatar */}
        <Tabs.Screen name="perfil" options={{ href: null, title: "Perfil" }} />
        <Tabs.Screen name="avisos" options={{ href: null, title: "Avisos" }} />

        {/* ── Hidden screens (accessible via router.push) ── */}
        <Tabs.Screen name="descubrir" options={{ href: null, title: "Descubrí" }} />
        <Tabs.Screen name="new-task" options={{ href: null, title: "Nueva tarea" }} />
        <Tabs.Screen name="dev-components" options={{ href: null, title: "Componentes" }} />
        <Tabs.Screen name="new-expense" options={{ href: null, title: "Nuevo gasto" }} />
        <Tabs.Screen name="expense-insights" options={{ href: null, title: "Insights financieros" }} />
        <Tabs.Screen name="services" options={{ href: null, title: "Servicios" }} />
      </Tabs>
      <AnotarSheet />
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    tabBarContainer: {
      backgroundColor: c.paper,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
      paddingBottom: Platform.OS === "ios" ? 24 : 12,
      paddingTop: 10,
    },
    tabBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingHorizontal: 12,
    },
    tabItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      height: 44,
    },
    tabLabel: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 12,
    },
    anotarButton: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: c.monte,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 8,
    },
  });
}
