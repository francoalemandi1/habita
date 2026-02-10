import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TasksPageContent } from "@/components/features/tasks-page-content";

export default async function TasksPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const tasks = await prisma.task.findMany({
    where: {
      householdId: member.householdId,
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <TasksPageContent tasks={tasks} />
    </div>
  );
}
