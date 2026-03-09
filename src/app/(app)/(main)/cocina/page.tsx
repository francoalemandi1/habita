import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isAIEnabled } from "@/lib/llm/provider";
import { CocinaClient } from "@/components/features/cocina-client";
import { PageHeader } from "@/components/ui/page-header";
import { spacing } from "@/lib/design-tokens";

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
      <PageHeader
        title="Cociná"
        subtitle="Sacá una foto de tu heladera y te sugerimos recetas"
      />
      <CocinaClient aiEnabled={aiEnabled} householdSize={householdSize} />
    </div>
  );
}
