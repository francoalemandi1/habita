import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RouletteView } from "@/components/features/roulette-view";

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
