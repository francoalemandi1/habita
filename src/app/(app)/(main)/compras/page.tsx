import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { ShoppingPlanView } from "@/components/features/grocery-advisor";
import { spacing, typography } from "@/lib/design-tokens";

export default async function ComprasPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const hasLocation = !!(member.household.latitude && member.household.longitude);

  return (
    <div className={spacing.pageContainer}>
      <div className={spacing.pageHeader}>
        <h1 className={typography.pageTitle}>Ahorrá</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compará precios en supermercados
        </p>
      </div>
      <ShoppingPlanView
        hasLocation={hasLocation}
        householdCity={member.household.city ?? null}
      />
    </div>
  );
}
