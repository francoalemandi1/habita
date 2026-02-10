import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/session";
import { CompetitionView } from "@/components/features/competition-view";

export const metadata = {
  title: "Competencias",
};

export default async function CompetitionsPage() {
  const member = await requireMember();

  const [activeCompetition, pastCompetitions] = await Promise.all([
    prisma.competition.findFirst({
      where: {
        householdId: member.householdId,
        status: "ACTIVE",
      },
      include: {
        scores: {
          include: {
            member: {
              select: { id: true, name: true, avatarUrl: true, memberType: true },
            },
          },
          orderBy: { points: "desc" },
        },
      },
    }),
    prisma.competition.findMany({
      where: {
        householdId: member.householdId,
        status: { in: ["COMPLETED", "CANCELLED"] },
      },
      include: {
        scores: {
          include: {
            member: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { points: "desc" },
          take: 3,
        },
      },
      orderBy: { endDate: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <CompetitionView
        activeCompetition={activeCompetition}
        pastCompetitions={pastCompetitions}
        currentMemberId={member.id}
        isAdult={member.memberType === "ADULT"}
      />
    </div>
  );
}
