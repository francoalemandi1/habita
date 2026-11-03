import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMember } from "@/lib/session";
import { isAIEnabled } from "@/lib/llm/provider";
import { ShoppingPlanView } from "@/components/features/grocery-advisor";
import { PageHeader } from "@/components/ui/page-header";
import { spacing } from "@/lib/design-tokens";
import { ListRow } from "@/components/ds/list-row";
import { Tag } from "lucide-react";
import { APP_ROUTES } from "@habita/contracts";

export default async function ComprasPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const hasLocation = !!(member.household.latitude && member.household.longitude);
  const aiEnabled = isAIEnabled();

  return (
    <div className={spacing.pageContainer}>
      <PageHeader
        title="Ahorrá"
        subtitle={<>Compará precios en supermercados · <Link href={APP_ROUTES.tareas} className="text-primary hover:underline">Mis tareas</Link></>}
      />
      <ShoppingPlanView
        hasLocation={hasLocation}
        householdCity={member.household.city ?? null}
      />

      {/* Más — interim link for views not yet merged into Súper (R3) */}
      {aiEnabled && (
        <div className="mt-6 rounded-2xl bg-card shadow-sm">
          <Link href="/grocery-deals"><ListRow leadingIcon={Tag} title="Top ofertas" /></Link>
        </div>
      )}
    </div>
  );
}
