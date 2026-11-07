import { ScrollView, StyleSheet } from "react-native";
import { Chip } from "@/components/ds";
import { spacing } from "@/theme";
import { PAYMENT_METHOD_OPTIONS } from "@/components/features/super/comparar/payment-methods";

import type { PaymentMethod } from "@/components/features/super/comparar/payment-methods";

interface PaymentMethodChipsProps {
  selected: PaymentMethod[];
  onToggle: (method: PaymentMethod) => void;
}

/** Simplified bank/wallet picker for the promo banner (design handoff §5.3) — plain chips, no search popover. */
export function PaymentMethodChips({ selected, onToggle }: PaymentMethodChipsProps): React.JSX.Element {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {PAYMENT_METHOD_OPTIONS.map((option) => (
        <Chip
          key={option.bankSlug}
          label={option.label}
          tone={selected.some((method) => method.bankSlug === option.bankSlug) ? "filterOn" : "filterOff"}
          onPress={() => onToggle(option)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm },
});
