"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Sheet } from "@/components/ds/sheet";
import { ListRow } from "@/components/ds/list-row";
import { useSnackbar } from "@/components/ds/snackbar";
import { CityTypeahead } from "@/components/ds/city-typeahead";
import { useGeolocation } from "@/hooks/use-geolocation";
import { apiFetch } from "@/lib/api-client";
import { formatLocationLabel } from "@/lib/perfil-household-logic";

import type { CityResult } from "@/components/ds/city-typeahead";
import type { HouseholdLocationSummary } from "@/lib/perfil-household-logic";

export interface LocationRowProps {
  initialLocation: HouseholdLocationSummary;
}

interface PendingLocation {
  latitude?: number;
  longitude?: number;
  timezone: string;
  country: string;
  city: string;
  displayLabel: string;
}

/** §5.3 Perfil → Mi hogar — "Ubicación" row + sheet (geolocation or manual city search), pattern B. */
export function LocationRow({ initialLocation }: LocationRowProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState(initialLocation);
  const [pending, setPending] = useState<PendingLocation | null>(null);
  const [citySearch, setCitySearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { location: geoLocation } = useGeolocation();
  const snackbar = useSnackbar();

  const browserTimezone =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/Argentina/Buenos_Aires";

  function handleDetect(): void {
    if (!geoLocation || geoLocation.latitude === 0) {
      setError("No pudimos detectar tu ubicación automáticamente. Buscá tu ciudad.");
      return;
    }
    setError(null);
    setPending({
      latitude: geoLocation.latitude,
      longitude: geoLocation.longitude,
      timezone: geoLocation.timezone,
      country: geoLocation.country,
      city: geoLocation.city,
      displayLabel: [geoLocation.city, geoLocation.country].filter(Boolean).join(", ") || geoLocation.timezone,
    });
  }

  function handleSelectCity(city: CityResult): void {
    setError(null);
    setPending({
      ...(city.latitude != null && { latitude: city.latitude }),
      ...(city.longitude != null && { longitude: city.longitude }),
      timezone: browserTimezone,
      country: "AR",
      city: city.name,
      displayLabel: `${city.name}, ${city.province}`,
    });
  }

  async function handleSave(): Promise<void> {
    if (!pending) return;
    setIsSaving(true);
    setError(null);
    try {
      await apiFetch("/api/households", {
        method: "PATCH",
        body: {
          location: {
            ...(pending.latitude != null && { latitude: pending.latitude }),
            ...(pending.longitude != null && { longitude: pending.longitude }),
            timezone: pending.timezone,
            country: pending.country,
            city: pending.city,
          },
        },
      });
      setLocation({ city: pending.city, country: pending.country, timezone: pending.timezone });
      setPending(null);
      setCitySearch("");
      setOpen(false);
      snackbar.show({ text: "Guardado" });
    } catch (err) {
      console.warn("No se pudo guardar la ubicación", err);
      setError("No se pudo guardar. Probá de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <ListRow leadingIcon={MapPin} title="Ubicación" meta={formatLocationLabel(location)} onClick={() => setOpen(true)} />
      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setPending(null);
            setError(null);
          }
        }}
        title="Ubicación"
      >
        <div className="space-y-4">
          <button type="button" onClick={handleDetect} className="flex items-center gap-2 text-[15px] font-medium text-monte">
            <MapPin className="size-4" strokeWidth={1.75} />
            Detectar mi ubicación
          </button>
          <CityTypeahead value={citySearch} onChange={setCitySearch} onSelectCity={handleSelectCity} placeholder="Buscar tu ciudad..." />
          {pending && <p className="text-[14px] text-ink-2">Vas a guardar: {pending.displayLabel}</p>}
          {error && <p className="text-[13px] text-ladrillo-text">{error}</p>}
          <button
            type="button"
            disabled={!pending || isSaving}
            onClick={() => void handleSave()}
            className="h-11 w-full rounded-[12px] bg-monte text-[15px] font-semibold text-paper disabled:bg-line disabled:text-ink-3"
          >
            Guardar
          </button>
        </div>
      </Sheet>
    </>
  );
}
