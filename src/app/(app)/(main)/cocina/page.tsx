import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { CocinaClient } from "@/components/features/cocina-client";
import { spacing, typography } from "@/lib/design-tokens";

export default async function CocinaPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const aiEnabled = isAIEnabled();
  const householdSize = await prisma.member.count({
    where: { householdId: member.householdId, isActive: true },
  });

  return (
    <div className={spacing.pageContainer}>
      <div className={spacing.pageHeader}>
        <h1 className={typography.pageTitle}>Cociná</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sacá una foto de tu heladera y te sugerimos recetas
        </p>
      </div>
      <CocinaClient aiEnabled={aiEnabled} householdSize={householdSize} />
    </div>
  );
}
