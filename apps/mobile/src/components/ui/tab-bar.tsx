import { useMemo } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { ViewStyle } from "react-native";

interface TabBarItem {
  key: string;
  label: string;
  badge?: number;
}

interface TabBarBaseProps {
  /** Scroll horizontally when there are many tabs */
  scrollable?: boolean;
  style?: ViewStyle;
}

interface TabBarKeyedProps extends TabBarBaseProps {
  items: TabBarItem[];
  activeKey: string;
  onChange: (key: string) => void;
  tabs?: never;
  activeIndex?: never;
  onTabPress?: never;
}

interface TabBarIndexedProps extends TabBarBaseProps {
  tabs: Array<{ label: string; badge?: number }>;
  activeIndex: number;
  onTabPress: (index: number) => void;
  items?: never;
  activeKey?: never;
  onChange?: never;
}

type TabBarProps = TabBarKeyedProps | TabBarIndexedProps;

function TabItem({
  item,
  isActive,
  onPress,
  colors,
}: {
  item: TabBarItem;
  isActive: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  const scale = useMemo(() => new Animated.Value(1), []);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={staticStyles.tabPressable}
    >
      <Animated.View
        style={[
          staticStyles.tabInner,
          isActive && {
            backgroundColor: colors.card,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 2,
            elevation: 1,
          },
          { transform: [{ scale }] },
        ]}
      >
        <Text
          style={[
            staticStyles.tabLabel,
            { color: isActive ? colors.text : colors.mutedForeground },
            isActive && staticStyles.tabLabelActive,
          ]}
        >
          {item.label}
        </Text>
        {item.badge != null && item.badge > 0 ? (
          <View style={[staticStyles.badge, { backgroundColor: colors.primary }]}>
            <Text style={staticStyles.badgeText}>
              {item.badge > 99 ? "99+" : item.badge}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

export function TabBar(props: TabBarProps) {
  const { scrollable = false, style } = props;
  const colors = useThemeColors();

  const wrapperStyle = useMemo(
    () => ({ backgroundColor: `${colors.muted}99`, borderRadius: radius.lg, padding: 4 as const }),
    [colors.muted],
  );

  // Normalize both APIs into the keyed format
  let resolvedItems: TabBarItem[];
  let resolvedActiveKey: string;
  let resolvedOnChange: (key: string) => void;

  if (props.tabs) {
    resolvedItems = props.tabs.map((t, i) => ({ key: String(i), label: t.label, badge: t.badge }));
    resolvedActiveKey = String(props.activeIndex);
    resolvedOnChange = (key) => props.onTabPress(Number(key));
  } else {
    resolvedItems = props.items;
    resolvedActiveKey = props.activeKey;
    resolvedOnChange = props.onChange;
  }

  const Container = scrollable ? ScrollView : View;
  const containerProps = scrollable
    ? {
        horizontal: true,
        showsHorizontalScrollIndicator: false,
        contentContainerStyle: staticStyles.scrollContent,
      }
    : { style: staticStyles.fixedContent };

  return (
    <View style={[wrapperStyle, style]}>
      <Container {...containerProps}>
        {resolvedItems.map((item) => (
          <TabItem
            key={item.key}
            item={item}
            isActive={item.key === resolvedActiveKey}
            onPress={() => resolvedOnChange(item.key)}
            colors={colors}
          />
        ))}
      </Container>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  fixedContent: {
    flexDirection: "row",
  },
  scrollContent: {
    flexDirection: "row",
    gap: 2,
  },
  tabPressable: {
    flex: 1,
  },
  tabInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.md,
  },
  tabLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: "500",
  },
  tabLabelActive: {
    fontWeight: "600",
  },
  badge: {
    borderRadius: radius.full,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
  },
});
