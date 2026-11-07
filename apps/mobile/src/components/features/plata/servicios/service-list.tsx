import { StyleSheet, Text, View } from "react-native";
import { ListRow } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight } from "@/theme";
import { CATEGORY_ICONS } from "@/lib/plata-categories";
import { toExpenseCategory } from "@/lib/plata-expense-category";
import { DUE_DATE_TONE_COLOR_KEY, dueDateInfo, frequencyLabel, toRecurringFrequency } from "@/lib/plata-servicios-logic";

import type { SerializedService } from "@/hooks/use-services";

interface ServiceListProps {
  services: SerializedService[];
  onSelect: (service: SerializedService) => void;
}

/** Services list (§5.3 "Plata" — Servicios, "lista de servicios con vencimiento"). */
export function ServiceList({ services, onSelect }: ServiceListProps): React.JSX.Element {
  const colors = useThemeColors();

  return (
    <View style={!services.length ? undefined : styles.list}>
      {services.map((service) => {
        const due = dueDateInfo(service.nextDueDate, new Date());
        const toneColor = colors[DUE_DATE_TONE_COLOR_KEY[due.tone]];
        return (
          <View key={service.id} style={!service.isActive ? styles.inactive : undefined}>
            <ListRow
              icon={CATEGORY_ICONS[toExpenseCategory(service.category, "OTHER")]}
              title={service.title}
              meta={frequencyLabel(toRecurringFrequency(service.frequency, "MONTHLY"))}
              trailing={<Text style={[styles.due, { color: toneColor }]}>{due.text}</Text>}
              onPress={() => onSelect(service)}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 0 },
  inactive: { opacity: 0.5 },
  due: { fontFamily: fontFamilyForWeight(500), fontSize: 13 },
});
