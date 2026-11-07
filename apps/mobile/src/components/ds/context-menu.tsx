import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight } from "@/theme";
import type { ThemeColors } from "@/theme";

export interface ContextMenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  /** Marks the row destructive, styled in ladrillo (conventionally the last item). */
  destructive?: boolean;
}

export interface ContextMenuProps {
  children: ReactNode;
  items: ContextMenuItem[];
}

/**
 * §6.17 ContextMenu — long-press opens a menu over a semi-opaque paper backdrop.
 * No blur lib is installed (out of the Step 1 scope); a flat paper overlay stands in.
 */
export function ContextMenu({ children, items }: ContextMenuProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Mantener presionado para ver más acciones"
        onLongPress={() => setOpen(true)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={[pressed && styles.pressedRow]}
      >
        {children}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} accessibilityLabel="Cerrar menú" onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="menuitem"
                  accessibilityLabel={item.label}
                  hitSlop={4}
                  onPress={() => {
                    setOpen(false);
                    item.onPress();
                  }}
                  style={styles.row}
                >
                  <Icon size={17} strokeWidth={1.75} color={item.destructive ? colors.ladrillo : colors.ink} />
                  <Text style={[styles.rowLabel, item.destructive && { color: colors.ladrillo }]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    pressedRow: {
      transform: [{ scale: 1.02 }],
      shadowColor: "rgba(29,38,32,.18)",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 24,
      elevation: 4,
    },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(243,239,231,0.85)",
      alignItems: "center",
      justifyContent: "center",
    },
    menu: {
      width: 240,
      borderRadius: 16,
      backgroundColor: c.surface,
      paddingVertical: 8,
      shadowColor: "rgba(29,38,32,.06)",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 2,
      elevation: 2,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    rowLabel: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink,
    },
  });
}
