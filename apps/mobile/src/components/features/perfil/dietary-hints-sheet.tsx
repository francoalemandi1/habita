import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { z } from "zod";
import { Button, Sheet, TextField } from "@/components/ds";
import { useUpdateHousehold } from "@/hooks/use-households";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { parseOnboardingProfile } from "@habita/domain/onboarding-profile";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { ThemeColors } from "@/theme";

export interface DietaryHintsSheetProps {
  visible: boolean;
  onClose: () => void;
  onboardingProfile: unknown;
}

const profileRecordSchema = z.record(z.string(), z.unknown());

function toProfileRecord(value: unknown): Record<string, unknown> {
  const parsed = profileRecordSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  return {};
}

/**
 * Hábitos de la casa — dietaryHints, saved into the household's onboardingProfile
 * exactly like the legacy Perfil screen did. They feed Descubrí's relax-finder
 * and the onboarding AI.
 */
export function DietaryHintsSheet({ visible, onClose, onboardingProfile }: DietaryHintsSheetProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const updateHousehold = useUpdateHousehold();
  const [newHint, setNewHint] = useState("");

  const dietaryHints = parseOnboardingProfile(onboardingProfile).dietaryHints;

  const save = (updated: string[]) => {
    const currentProfile = toProfileRecord(onboardingProfile);
    updateHousehold.mutate(
      { onboardingProfile: { ...currentProfile, dietaryHints: updated } },
      {
        onSuccess: () => setNewHint(""),
        onError: (error) => {
          Alert.alert("No se pudo guardar", getMobileErrorMessage(error));
        },
      },
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Hábitos de la casa">
      {dietaryHints.length > 0 ? (
        <View style={styles.chips}>
          {dietaryHints.map((hint, index) => (
            <View key={`${hint}-${index}`} style={styles.chip}>
              <Text style={styles.chipText}>{hint}</Text>
              <Pressable
                hitSlop={8}
                disabled={updateHousehold.isPending}
                onPress={() => save(dietaryHints.filter((_, i) => i !== index))}
              >
                <X size={14} strokeWidth={1.75} color={colors.ink2} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>Sin hábitos registrados. Agregá restricciones o gustos alimentarios.</Text>
      )}
      <View style={styles.inputRow}>
        <TextField
          label="Nuevo hábito"
          value={newHint}
          onChangeText={setNewHint}
          placeholder="Vegetariano, sin TACC…"
          containerStyle={styles.input}
        />
        <Button
          label="Agregar"
          size="sm"
          disabled={!newHint.trim() || updateHousehold.isPending}
          onPress={() => {
            if (newHint.trim()) save([...dietaryHints, newHint.trim()]);
          }}
          style={styles.addButton}
        />
      </View>
    </Sheet>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.sand,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    chipText: {
      fontFamily: fontFamilyForWeight(500),
      fontSize: 13,
      color: c.ink,
    },
    empty: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ink2,
      marginBottom: spacing.md,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    input: {
      flex: 1,
    },
    addButton: {
      marginTop: 20,
    },
  });
}
