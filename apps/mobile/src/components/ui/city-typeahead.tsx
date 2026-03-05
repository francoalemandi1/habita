import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import type { CityResult } from "@/hooks/use-cities";
import { useCitySearch } from "@/hooks/use-cities";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamily, radius, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";

import { StyledTextInput } from "./text-input";

interface CityTypeaheadProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectCity: (city: CityResult) => void;
  placeholder?: string;
  label?: string;
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      position: "relative",
    },
    dropdown: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      zIndex: 10,
    },
    dropdownItem: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    itemText: {
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.text,
    },
    provinceText: {
      fontFamily: fontFamily.sans,
      fontSize: 12,
      color: c.mutedForeground,
    },
  });
}

export function CityTypeahead({ value, onChangeText, onSelectCity, placeholder, label }: CityTypeaheadProps) {
  const c = useThemeColors();
  const styles = useMemo(() => createStyles(c), [c]);

  const [debouncedQuery, setDebouncedQuery] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(value);
    }, 200);
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
      <StyledTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        label={label}
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
