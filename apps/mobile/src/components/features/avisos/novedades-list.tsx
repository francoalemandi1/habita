import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Bell } from "lucide-react-native";
import { Badge, Banner, Button, EmptyState, Skeleton } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { NotificationItem } from "@habita/contracts";

export interface NovedadesListProps {
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  notifications: NotificationItem[];
}

/** §5.3 Avisos — "Novedades", the general notification feed below "Para resolver". */
export function NovedadesList({ isLoading, isError, onRetry, notifications }: NovedadesListProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (isError) {
    return (
      <View style={styles.loading}>
        <Banner tone="attention" text="No pudimos cargar las novedades." />
        {onRetry ? <Button label="Reintentar" variant="link" onPress={onRetry} /> : null}
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Skeleton height={64} />
        <Skeleton height={64} />
      </View>
    );
  }

  if (notifications.length === 0) {
    return <EmptyState icon={Bell} title="Estás al día" description="No hay novedades nuevas." />;
  }

  return (
    <View style={styles.list}>
      {notifications.map((notification) => (
        <View key={notification.id} style={styles.item}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>{notification.title}</Text>
            {!notification.isRead ? <Badge label="Nueva" tone="monte" /> : null}
          </View>
          <Text style={styles.itemMessage}>{notification.message}</Text>
          <Text style={styles.itemDate}>{new Date(notification.createdAt).toLocaleString("es-AR")}</Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    loading: {
      gap: spacing.sm,
    },
    list: {
      gap: spacing.sm,
    },
    item: {
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.lineSoft,
    },
    itemHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 2,
    },
    itemTitle: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 14,
      color: c.ink,
      flex: 1,
      marginRight: spacing.sm,
    },
    itemMessage: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
      marginBottom: 2,
    },
    itemDate: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 11,
      color: c.ink3,
    },
  });
}
