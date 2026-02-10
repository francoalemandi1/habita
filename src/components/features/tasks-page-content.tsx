"use client";

import { useRouter } from "next/navigation";
import { TaskList } from "@/components/features/task-list";
import { TaskCatalogPicker } from "@/components/features/task-catalog-picker";

import type { Task } from "@prisma/client";

interface TasksPageContentProps {
  tasks: Task[];
}

export function TasksPageContent({ tasks }: TasksPageContentProps) {
  const router = useRouter();

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Tareas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona las tareas de tu hogar
          </p>
        </div>
        <TaskCatalogPicker
          existingTaskNames={tasks.map((t) => t.name)}
          onTasksCreated={() => router.refresh()}
        />
      </div>

      <TaskList tasks={tasks} />
    </>
  );
}
