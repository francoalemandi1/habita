import { Redirect, Tabs, useRouter } from "expo-router";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { fontFamily } from "@/theme";
import { useThemeColors } from "@/hooks/use-theme";
import {
  ChefHat,
  ClipboardCheck,
  Compass,
  Home,
  MoreHorizontal,
  Receipt,
  ShoppingCart,
} from "lucide-react-native";

import type { LucideIcon } from "lucide-react-native";
import type { ThemeColors } from "@/theme";

// ─── Custom tab bar ──────────────────────────────────────────────────────────

const TAB_CONFIG: Record<string, { Icon: LucideIcon; label: string }> = {
  dashboard: { Icon: Home, label: "Habita" },
  tasks: { Icon: ClipboardCheck, label: "Planificá" },
  balance: { Icon: Receipt, label: "Registrá" },
  compras: { Icon: ShoppingCart, label: "Ahorrá" },
};

const MORE_ITEMS: { screen: string; Icon: LucideIcon; label: string }[] = [
  { screen: "descubrir", Icon: Compass, label: "Descubrí" },
  { screen: "cocina", Icon: ChefHat, label: "Cociná" },
];

function AnimatedTabItem({
  focused,
  Icon,
  label,
  onPress,
  onLongPress,
}: {
  focused: boolean;
  Icon: LucideIcon;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable animated values
  const scale = useMemo(() => new Animated.Value(focused ? 1.05 : 1), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable animated values
  const bgOpacity = useMemo(() => new Animated.Value(focused ? 1 : 0), []);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.05 : 1,
        damping: 18,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.timing(bgOpacity, {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, scale, bgOpacity]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.tabItemInner, { transform: [{ scale }] }]}>
        <Animated.View style={[styles.tabPill, { opacity: bgOpacity }]} />
        <Icon
          size={20}
          color={focused ? "#d2ffa0" : "rgba(255,255,255,0.65)"}
          strokeWidth={focused ? 2.4 : 1.8}
        />
        <Text
          style={[
            styles.tabLabel,
            focused ? styles.tabLabelActive : styles.tabLabelInactive,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** Minimal type for the tab bar props we need — avoids importing @react-navigation/bottom-tabs. */
interface TabBarProps {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  descriptors: Record<string, { options?: { href?: string | null; tabBarItemStyle?: { display?: string } } } | undefined>;
  navigation: {
    emit: (event: { type: string; target: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  // Check if currently on a "more" screen
  const currentRoute = state.routes[state.index]?.name;
  const isMoreActive = MORE_ITEMS.some((item) => item.screen === currentRoute);

  const handleMoreItem = useCallback((screen: string) => {
    setMoreOpen(false);
    router.push(`/(app)/${screen}` as never);
  }, [router]);

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {state.routes.map((route) => {
          const config = TAB_CONFIG[route.name];
          if (!config) return null;

          const options = descriptors[route.key]?.options;
          if (options?.href === null) return null;
          if (options?.tabBarItemStyle?.display === "none") return null;

          const focused = state.index === state.routes.indexOf(route);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <AnimatedTabItem
              key={route.key}
              focused={focused}
              Icon={config.Icon}
              label={config.label}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}

        {/* "Más" button */}
        <Pressable
          onPress={() => setMoreOpen(true)}
          style={styles.tabItem}
        >
          <View style={styles.tabItemInner}>
            {(isMoreActive) && <View style={styles.tabPillStatic} />}
            <MoreHorizontal
              size={20}
              color={isMoreActive ? "#d2ffa0" : "rgba(255,255,255,0.65)"}
              strokeWidth={isMoreActive ? 2.4 : 1.8}
            />
            <Text
              style={[
                styles.tabLabel,
                isMoreActive ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}
              numberOfLines={1}
            >
              Más
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Bottom sheet modal for "Más" */}
      <Modal
        visible={moreOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMoreOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMoreOpen(false)}>
          <View style={[styles.moreSheet, { backgroundColor: colors.card }]}>
            {MORE_ITEMS.map((item) => {
              const isActive = currentRoute === item.screen;
              return (
                <Pressable
                  key={item.screen}
                  style={[
                    styles.moreItem,
                    isActive && { backgroundColor: colors.primary + "18" },
                  ]}
                  onPress={() => handleMoreItem(item.screen)}
                >
                  <item.Icon
                    size={20}
                    color={isActive ? colors.primary : colors.text}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  <Text
                    style={[
                      styles.moreItemLabel,
                      { color: isActive ? colors.primary : colors.text },
                      isActive && { fontWeight: "700" },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
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
    <Tabs
      tabBar={(props) => <CustomTabBar {...(props as unknown as TabBarProps)} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* ── Tabs (visible in tab bar) ── */}
      <Tabs.Screen name="dashboard" options={{ title: "Habita" }} />
      <Tabs.Screen name="tasks" options={{ title: "Planificá" }} />
      <Tabs.Screen name="balance" options={{ title: "Registrá" }} />
      <Tabs.Screen name="compras" options={{ title: "Ahorrá" }} />

      {/* ── "Más" screens (accessible via bottom sheet) ── */}
      <Tabs.Screen name="descubrir" options={{ href: null, title: "Descubrí" }} />
      <Tabs.Screen name="cocina" options={{ href: null, title: "Cociná" }} />

      {/* Profile — hidden from tab bar, accessible via ScreenHeader avatar */}
      <Tabs.Screen name="profile" options={{ href: null, title: "Perfil" }} />

      {/* ── Hidden screens (accessible via router.push) ── */}
      <Tabs.Screen name="new-task" options={{ href: null, title: "Nueva tarea" }} />
      <Tabs.Screen name="new-expense" options={{ href: null, title: "Nuevo gasto" }} />
      <Tabs.Screen name="expense-insights" options={{ href: null, title: "Insights financieros" }} />
      <Tabs.Screen name="plan" options={{ href: null, title: "Plan semanal" }} />
      <Tabs.Screen name="transfers" options={{ href: null, title: "Transferencias" }} />
      <Tabs.Screen name="notifications" options={{ href: null, title: "Notificaciones" }} />
      <Tabs.Screen name="task-catalog" options={{ href: null, title: "Catálogo de tareas" }} />
      <Tabs.Screen name="progress" options={{ href: null, title: "Progreso familiar" }} />
      <Tabs.Screen name="fund" options={{ href: null, title: "Fondo Común" }} />
      <Tabs.Screen name="services" options={{ href: null, title: "Servicios" }} />
      <Tabs.Screen name="preferences" options={{ href: null, title: "Mis preferencias" }} />
      <Tabs.Screen name="rotations" options={{ href: null, title: "Ruleta de tareas" }} />
      <Tabs.Screen name="suggest-tasks" options={{ href: null, title: "Sugerencias AI" }} />
      <Tabs.Screen name="grocery-deals" options={{ href: null, title: "Ofertas del super" }} />
      <Tabs.Screen name="notification-settings" options={{ href: null, title: "Notificaciones push" }} />
    </Tabs>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    tabBarContainer: {
      backgroundColor: c.background,
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === "ios" ? 24 : 12,
      paddingTop: 8,
    },
    tabBar: {
      flexDirection: "row",
      height: 58,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "space-around",
      paddingHorizontal: 8,
      borderRadius: 20,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
    tabItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      height: 58,
    },
    tabItemInner: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 5,
      paddingHorizontal: 14,
      borderRadius: 14,
      position: "relative",
    },
    tabPill: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(255,255,255,0.14)",
      borderRadius: 14,
    },
    tabPillStatic: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(255,255,255,0.14)",
      borderRadius: 14,
    },
    tabLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 10,
      marginTop: 3,
      textAlign: "center",
    },
    tabLabelActive: {
      fontWeight: "700",
      color: "#d2ffa0",
    },
    tabLabelInactive: {
      fontWeight: "500",
      color: "rgba(255,255,255,0.65)",
    },
    // "Más" bottom sheet
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    moreSheet: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 40 : 24,
      paddingHorizontal: 16,
    },
    moreItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 14,
    },
    moreItemLabel: {
      fontFamily: fontFamily.sans,
      fontSize: 16,
      fontWeight: "500",
    },
  });
}
