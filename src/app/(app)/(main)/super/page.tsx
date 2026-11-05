import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { SuperSegments } from "@/components/features/super/super-segments";
import { SuperView } from "@/components/features/super/super-view";

import type { SuperViewKey } from "@/components/features/super/super-segments";

function resolveView(value: string | string[] | undefined): SuperViewKey {
  return value === "comparar" || value === "ofertas" ? value : "lista";
}

interface SuperPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SuperPage({ searchParams }: SuperPageProps): Promise<React.JSX.Element> {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/onboarding");
  }

  const params = await searchParams;
  const view = resolveView(params.v);

  return (
    <div className="flex flex-col gap-6 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[32px] font-bold leading-[1.05] tracking-[-.035em] text-ink">Súper</h1>
        <SuperSegments active={view} />
      </div>

      <SuperView view={view} currentMemberId={member.id} householdCity={member.household.city ?? null} />
    </div>
  );
}
