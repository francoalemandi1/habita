"use client";

import { TextField } from "@/components/ds";
import { CityTypeahead } from "@/components/ds/city-typeahead";
import { CompositionGrid } from "@/components/features/onboarding/composition-grid";

import type { CityResult } from "@/components/ds/city-typeahead";
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
  return (
    <div className="space-y-6">
      <h1 className="text-[32px] font-bold leading-tight tracking-[-0.035em] text-ink">Creá tu hogar</h1>

      <TextField
        label="Nombre"
        placeholder="Ej: Casa de los García"
        value={householdName}
        onChange={(e) => onHouseholdNameChange(e.target.value)}
        maxLength={50}
        autoFocus
      />

      <div className="space-y-2">
        <p className="text-[13px] font-semibold text-ink">¿Con quién vivís?</p>
        <CompositionGrid value={composition} onChange={onCompositionChange} />
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-ink">Barrio o ciudad</p>
        <CityTypeahead value={city} onChange={onCityChange} onSelectCity={onSelectCity} placeholder="Ej: Palermo, CABA" />
        <p className="text-[13px] text-ink-2">Lo usamos para precios del súper y planes cerca.</p>
      </div>

      {error && <p className="text-[13px] text-ladrillo-text">{error}</p>}
    </div>
  );
}
