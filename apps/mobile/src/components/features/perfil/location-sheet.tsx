import { useState } from "react";
import { Alert } from "react-native";
import { Button, Sheet, TextField } from "@/components/ds";
import { useUpdateHousehold } from "@/hooks/use-households";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { spacing } from "@/theme";

export interface LocationSheetProps {
  visible: boolean;
  onClose: () => void;
  initialCity: string | null;
}

/**
 * Ubicación: manual city entry (geolocation would need expo-location, a new
 * dependency this task can't add). The device's own timezone travels with it,
 * since quiet hours, the weekly-plan cron and parse-entry all key off the
 * household timezone.
 */
export function LocationSheet({ visible, onClose, initialCity }: LocationSheetProps): React.JSX.Element {
  const [city, setCity] = useState(initialCity ?? "");
  const [wasVisible, setWasVisible] = useState(visible);
  const updateHousehold = useUpdateHousehold();

  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setCity(initialCity ?? "");
  }

  const handleSave = () => {
    const trimmed = city.trim();
    if (!trimmed) return;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    updateHousehold.mutate(
      { location: { city: trimmed, timezone } },
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
      <TextField label="Ciudad" value={city} onChangeText={setCity} placeholder="Córdoba" />
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
