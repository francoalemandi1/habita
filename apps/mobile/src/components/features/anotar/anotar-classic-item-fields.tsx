import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Stepper, TextField } from "@/components/ds";
import { spacing } from "@/theme";

export interface ClassicItemState {
  name: string;
  quantity: number;
}

interface AnotarClassicItemFieldsProps {
  state: ClassicItemState;
  onChange: (next: Partial<ClassicItemState>) => void;
}

export function AnotarClassicItemFields({ state, onChange }: AnotarClassicItemFieldsProps): React.JSX.Element {
  const styles = useMemo(() => createStyles(), []);

  return (
    <View style={styles.container}>
      <TextField label="Ítem" value={state.name} onChangeText={(name) => onChange({ name })} />
      <Stepper
        value={state.quantity}
        onValueChange={(quantity) => onChange({ quantity })}
        min={1}
        max={99}
        accessibilityLabel="Cantidad"
      />
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: {
      gap: spacing.md,
    },
  });
}
