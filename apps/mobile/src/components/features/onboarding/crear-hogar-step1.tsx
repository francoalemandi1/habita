import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CityTypeahead, TextField } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing, typography } from "@/theme";
import { CompositionGrid } from "@/components/features/onboarding/composition-grid";

import type { CityResult } from "@/components/ds";
import type { ThemeColors } from "@/theme";
import type { HouseholdComposition } from "@/lib/onboarding-starter-tasks";

interface CrearHogarStep1Props {
  householdName: string;
  onHouseholdNameChange: (value: string) => void;
  composition: HouseholdComposition | null;
  onCompositionChange: (value: HouseholdComposition) => void;
  city: string;
  onCityChange: (value: string) => void;
  onSelectCity: (city: CityResult) => void;
  error?: string | null;
}

/** Crear hogar — step 1, per handoff §5.3. */
export function CrearHogarStep1({
  householdName,
  onHouseholdNameChange,
  composition,
  onCompositionChange,
  city,
  onCityChange,
  onSelectCity,
  error,
}: CrearHogarStep1Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.form}>
      <Text style={styles.title}>Creá tu hogar</Text>

      <TextField
        label="Nombre"
        placeholder="Ej: Casa de los García"
        value={householdName}
        onChangeText={onHouseholdNameChange}
        maxLength={50}
      />

      <View style={styles.compositionBlock}>
        <Text style={styles.compositionLabel}>¿Con quién vivís?</Text>
        <CompositionGrid value={composition} onChange={onCompositionChange} />
      </View>

      <View>
        <CityTypeahead
          label="Barrio o ciudad"
          placeholder="Ej: Palermo, CABA"
          value={city}
          onChangeText={onCityChange}
          onSelectCity={onSelectCity}
        />
        <Text style={styles.hint}>Lo usamos para precios del súper y planes cerca.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    form: { gap: spacing.xl },
    title: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: typography.pageTitle.fontSize,
      color: c.ink,
    },
    compositionBlock: { gap: spacing.sm },
    compositionLabel: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 13,
      color: c.ink,
    },
    hint: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: typography.b2.fontSize,
      color: c.ink2,
      marginTop: spacing.xs,
    },
    error: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ladrilloText,
    },
  });
}
