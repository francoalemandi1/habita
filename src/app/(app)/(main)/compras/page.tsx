import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMember } from "@/lib/session";
import { isAIEnabled } from "@/lib/llm/provider";
import { ShoppingPlanView } from "@/components/features/grocery-advisor";
import { spacing, typography } from "@/lib/design-tokens";

export default async function ComprasPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const hasLocation = !!(member.household.latitude && member.household.longitude);
  const aiEnabled = isAIEnabled();

  return (
    <div className={spacing.pageContainer}>
      <div className={spacing.pageHeader}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={typography.pageTitle}>Ahorrá</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Compará precios en supermercados
            </p>
          </div>
          {aiEnabled && (
            <Link
              href="/grocery-deals"
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Top ofertas →
            </Link>
          )}
        </div>
      </div>
      <ShoppingPlanView
        hasLocation={hasLocation}
        householdCity={member.household.city ?? null}
      />
    </div>
  );
}
