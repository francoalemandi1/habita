import { useMemo } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { ListRow, Sheet } from "@/components/ds";
import { useUpdateHousehold } from "@/hooks/use-households";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useThemeColors } from "@/hooks/use-theme";
import { spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

export interface PlanningDaySheetProps {
  visible: boolean;
  onClose: () => void;
  planningDay: number | null;
}

/** planningDay follows JS `Date#getDay()`: 0 = domingo … 6 = sábado. */
const PLANNING_DAY_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: "Sin preferencia" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export function PlanningDaySheet({ visible, onClose, planningDay }: PlanningDaySheetProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const updateHousehold = useUpdateHousehold();

  const handleSelect = (value: number | null) => {
    updateHousehold.mutate(
      { planningDay: value },
      {
        onSuccess: onClose,
        onError: (error) => {
          Alert.alert("No se pudo guardar", getMobileErrorMessage(error));
        },
      },
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Día del plan">
      <Text style={styles.hint}>El plan semanal se arma automáticamente ese día.</Text>
      <View style={styles.list}>
        {PLANNING_DAY_OPTIONS.map((option) => {
          const isActive = option.value === planningDay;
          return (
            <ListRow
              key={option.label}
              title={option.label}
              onPress={() => handleSelect(option.value)}
              trailing={isActive ? <Check size={18} strokeWidth={1.75} color={colors.monte} /> : undefined}
            />
          );
        })}
      </View>
    </Sheet>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    hint: {
      fontSize: 13,
      color: c.ink2,
      marginBottom: spacing.sm,
    },
    list: {
      marginBottom: spacing.lg,
    },
  });
}
