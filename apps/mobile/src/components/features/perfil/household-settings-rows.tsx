import { useState } from "react";
import { MapPin, Salad, SlidersHorizontal } from "lucide-react-native";
import { ListRow } from "@/components/ds";
import { LocationSheet } from "./location-sheet";
import { PlanningDaySheet } from "./planning-day-sheet";
import { DietaryHintsSheet } from "./dietary-hints-sheet";
import { parseHouseholdSettings } from "@/lib/perfil-household-settings";

export interface HouseholdSettingsRowsProps {
  household: unknown;
  onboardingProfile: unknown;
}

/**
 * Household-level settings kept from the legacy Perfil, opened as level-2
 * sheets on the same screen: Ubicación, Día del plan and Hábitos de la casa.
 */
export function HouseholdSettingsRows({ household, onboardingProfile }: HouseholdSettingsRowsProps): React.JSX.Element {
  const [showLocation, setShowLocation] = useState(false);
  const [showPlanningDay, setShowPlanningDay] = useState(false);
  const [showDietaryHints, setShowDietaryHints] = useState(false);

  const settings = parseHouseholdSettings(household);

  return (
    <>
      <ListRow icon={MapPin} title="Ubicación" meta={settings.city ?? undefined} onPress={() => setShowLocation(true)} />
      <ListRow icon={SlidersHorizontal} title="Día del plan" onPress={() => setShowPlanningDay(true)} />
      <ListRow icon={Salad} title="Hábitos de la casa" onPress={() => setShowDietaryHints(true)} />

      <LocationSheet visible={showLocation} onClose={() => setShowLocation(false)} initialCity={settings.city} />
      <PlanningDaySheet
        visible={showPlanningDay}
        onClose={() => setShowPlanningDay(false)}
        planningDay={settings.planningDay}
      />
      <DietaryHintsSheet
        visible={showDietaryHints}
        onClose={() => setShowDietaryHints(false)}
        onboardingProfile={onboardingProfile}
      />
    </>
  );
}
