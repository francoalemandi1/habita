import { LocationRow } from "@/components/features/perfil/location-sheet";
import { PlanningDayRow } from "@/components/features/perfil/planning-day-sheet";
import { HouseholdHabitsRow } from "@/components/features/perfil/household-habits-sheet";

import type { HouseholdLocationSummary } from "@/lib/perfil-household-logic";
import type { OccupationLevel } from "@/lib/validations/member";
import type { ParsedOnboardingProfile } from "@/lib/onboarding-profile";

export interface HouseholdSettingsRowsProps {
  location: HouseholdLocationSummary;
  planningDay: number | null;
  memberId: string;
  occupationLevel: OccupationLevel;
  onboardingProfile: ParsedOnboardingProfile;
}

/**
 * §5.3 Perfil → Mi hogar — adult-only rows restored from the deleted profile-settings.tsx:
 * Ubicación and Día del plan are household-level (PATCH /api/households 403s non-adults);
 * Hábitos de la casa is bundled here too so all three adult-administered settings live together.
 */
export function HouseholdSettingsRows({
  location,
  planningDay,
  memberId,
  occupationLevel,
  onboardingProfile,
}: HouseholdSettingsRowsProps): React.JSX.Element {
  return (
    <div className="rounded-[16px] bg-surface px-1">
      <LocationRow initialLocation={location} />
      <PlanningDayRow initialPlanningDay={planningDay} />
      <HouseholdHabitsRow memberId={memberId} initialOccupationLevel={occupationLevel} initialOnboardingProfile={onboardingProfile} />
    </div>
  );
}
