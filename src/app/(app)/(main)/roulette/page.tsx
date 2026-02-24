import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isSoloHousehold } from "@/lib/household-mode";
import { RouletteView } from "@/components/features/roulette-view";
import { Dices, UserPlus } from "lucide-react";

export const metadata = {
  title: "Ruleta",
};

export default async function RoulettePage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const householdId = member.householdId;

  const [rouletteTasks, allMembers, catalogTasks] = await Promise.all([
    prisma.task.findMany({
      where: {
        householdId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        weight: true,
        frequency: true,
        estimatedMinutes: true,
      },
      orderBy: { name: "asc" },
      take: 50,
    }),
    prisma.member.findMany({
      where: {
        householdId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        memberType: true,
        avatarUrl: true,
      },
    }),
    prisma.taskCatalog.findMany({
      select: {
        name: true,
        defaultWeight: true,
        defaultFrequency: true,
        estimatedMinutes: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Filter out catalog tasks that already exist as household tasks
  const householdTaskNames = new Set(
    rouletteTasks.map((t) => t.name.toLowerCase()),
  );
  const catalogSuggestions = catalogTasks
    .filter((c) => !householdTaskNames.has(c.name.toLowerCase()))
    .map((c) => ({
      name: c.name,
      weight: c.defaultWeight,
      frequency: c.defaultFrequency,
      estimatedMinutes: c.estimatedMinutes,
    }));

  if (isSoloHousehold(allMembers.length)) {
    return (
      <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-muted/30 px-6 py-16 text-center">
          <Dices className="h-12 w-12 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold">La ruleta necesita al menos 2 miembros</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Invitá a alguien a tu hogar para poder usar la ruleta y asignar tareas al azar.
          </p>
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" />
            Invitar a alguien
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <RouletteView
        initialTasks={rouletteTasks}
        catalogSuggestions={catalogSuggestions}
        initialMembers={allMembers}
        currentMemberId={member.id}
      />
    </div>
  );
}
