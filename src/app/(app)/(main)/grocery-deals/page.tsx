import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { GroceryDealsView } from "@/components/features/grocery-deals-view";

export const metadata = {
  title: "Ofertas del Día",
};

export default async function GroceryDealsPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  const hasHouseholdLocation = !!(member.household.latitude && member.household.longitude);

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <GroceryDealsView
        hasHouseholdLocation={hasHouseholdLocation}
        householdCity={member.household.city ?? null}
      />
    </div>
  );
}
