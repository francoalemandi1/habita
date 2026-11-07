import { useState } from "react";
import { Alert } from "react-native";
import { Button, CityTypeahead, Sheet } from "@/components/ds";
import { useUpdateHousehold } from "@/hooks/use-households";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { spacing } from "@/theme";

import type { CityResult } from "@/components/ds";

export interface LocationSheetProps {
  visible: boolean;
  onClose: () => void;
  initialCity: string | null;
}

/**
 * Ubicación: city search with suggestions (geolocation would need expo-location,
 * a new dependency this task can't add). The device's own timezone travels with
 * it, since quiet hours, the weekly-plan cron and parse-entry all key off the
 * household timezone. Typing without picking a suggestion still saves the
 * typed city, without inventing coordinates.
 */
export function LocationSheet({ visible, onClose, initialCity }: LocationSheetProps): React.JSX.Element {
  const [city, setCity] = useState(initialCity ?? "");
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null);
  const [wasVisible, setWasVisible] = useState(visible);
  const updateHousehold = useUpdateHousehold();

  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setCity(initialCity ?? "");
      setSelectedCity(null);
    }
  }

  const handleSave = () => {
    const trimmed = city.trim();
    if (!trimmed) return;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    updateHousehold.mutate(
      {
        location: {
          city: selectedCity?.name ?? trimmed,
          timezone,
          ...(selectedCity?.latitude != null && { latitude: selectedCity.latitude }),
          ...(selectedCity?.longitude != null && { longitude: selectedCity.longitude }),
          ...(selectedCity && { country: "AR" }),
        },
      },
      {
        onSuccess: onClose,
        onError: (error) => {
          Alert.alert("No se pudo guardar", getMobileErrorMessage(error));
        },
      },
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Ubicación">
      <CityTypeahead
        label="Ciudad"
        value={city}
        onChangeText={(value) => {
          setCity(value);
          setSelectedCity(null);
        }}
        onSelectCity={setSelectedCity}
        placeholder="Córdoba"
      />
      <Button
        label="Guardar"
        loading={updateHousehold.isPending}
        disabled={!city.trim() || updateHousehold.isPending}
        onPress={handleSave}
        style={{ marginTop: spacing.lg }}
      />
    </Sheet>
  );
}
