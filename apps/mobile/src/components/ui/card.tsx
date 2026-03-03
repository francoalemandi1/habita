import { View } from "react-native";
import { commonStyles, spacing, radius, shadows } from "@/theme";

import type { ViewProps } from "react-native";

interface CardProps extends ViewProps {
  noPadding?: boolean;
}

export function Card({ style, noPadding, children, ...props }: CardProps) {
  return (
    <View
      style={[commonStyles.card, style]}
      {...props}
    >
      {children}
    </View>
  );
}

interface CardContentProps extends ViewProps {
  compact?: boolean;
}

export function CardContent({ style, compact, children, ...props }: CardContentProps) {
  return (
    <View
      style={[{ padding: compact ? spacing.md : spacing.lg }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ style, children, ...props }: ViewProps) {
  return (
    <View
      style={[
        {
          padding: spacing.lg,
          paddingBottom: spacing.sm,
          gap: spacing.xs,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardFooter({ style, children, ...props }: ViewProps) {
  return (
    <View
      style={[
        {
          padding: spacing.lg,
          paddingTop: spacing.sm,
          flexDirection: "row",
          alignItems: "center",
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
