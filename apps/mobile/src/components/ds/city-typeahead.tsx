import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import { radii as radius } from "@habita/design-tokens";
import { useCitySearch } from "@/hooks/use-cities";
import { TextField } from "./text-field";

import type { CityResult } from "@/hooks/use-cities";
import type { ThemeColors } from "@/theme";

export type { CityResult };

interface CityTypeaheadProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectCity: (city: CityResult) => void;
  placeholder?: string;
  label?: string;
}

/** §6.3 TextField shape — city search with suggestions, used in Crear hogar and Perfil → Ubicación. */
export function CityTypeahead({ value, onChangeText, onSelectCity, placeholder, label = "Ciudad" }: CityTypeaheadProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [debouncedQuery, setDebouncedQuery] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(value), 200);
    return () => clearTimeout(timer);
  }, [value]);

  const { data } = useCitySearch(debouncedQuery);
  const cities = data?.cities ?? [];
  const showDropdown = isFocused && cities.length > 0;

  function handleSelectCity(city: CityResult) {
    onChangeText(`${city.name}, ${city.province}`);
    onSelectCity(city);
    setIsFocused(false);
  }

  return (
    <View style={styles.container}>
      <TextField
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoCorrect={false}
        autoCapitalize="words"
      />
      {showDropdown ? (
        <View style={styles.dropdown}>
          <FlatList
            data={cities}
            keyExtractor={(city) => city.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: city }) => (
              <Pressable style={styles.dropdownItem} onPress={() => handleSelectCity(city)}>
                <Text style={styles.itemText}>{city.name}</Text>
                <Text style={styles.provinceText}>{city.province}</Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { position: "relative" },
    dropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.control,
      zIndex: 10,
    },
    dropdownItem: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    itemText: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 14,
      color: c.ink,
    },
    provinceText: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 12,
      color: c.ink2,
    },
  });
}
