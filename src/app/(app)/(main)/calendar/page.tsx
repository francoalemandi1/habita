import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FridgeCalendarView } from "@/components/features/fridge-calendar-view";
import { getWeekMonday, getWeekSunday } from "@/lib/calendar-utils";

export const metadata = {
  title: "Calendario",
};

export default async function CalendarPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const householdId = member.householdId;
  const monday = getWeekMonday(new Date());
  const sunday = getWeekSunday(monday);

  const [assignments, members] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        householdId,
        dueDate: { gte: monday, lte: sunday },
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        dueDate: true,
        status: true,
        completedAt: true,
        task: {
          select: {
            id: true,
            name: true,
            weight: true,
            frequency: true,
            estimatedMinutes: true,
          },
        },
        member: {
          select: {
            id: true,
            name: true,
            memberType: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.member.findMany({
      where: { householdId, isActive: true },
      select: {
        id: true,
        name: true,
        memberType: true,
        avatarUrl: true,
      },
    }),
  ]);

  // Serialize dates as ISO strings for the client component
  const serializedAssignments = assignments.map((a) => ({
    ...a,
    dueDate: a.dueDate.toISOString(),
    completedAt: a.completedAt?.toISOString() ?? null,
  }));

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <FridgeCalendarView
        initialAssignments={serializedAssignments}
        members={members}
        initialWeekStart={monday.toISOString()}
      />
    </div>
  );
}
