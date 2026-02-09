import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TaskList } from "@/components/features/task-list";
import { TaskCatalogPicker } from "@/components/features/task-catalog-picker";

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
    <div className="container max-w-4xl px-4 py-6 sm:py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tareas</h1>
          <p className="text-muted-foreground">
            Gestiona las tareas de tu hogar
          </p>
        </div>
        <TaskCatalogPicker
          existingTaskNames={tasks.map((t) => t.name)}
          onTasksCreated={() => {}}
        />
      </div>

      <TaskList tasks={tasks} />
    </div>
  );
}
