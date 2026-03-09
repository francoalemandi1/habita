"use client";

import { useRouter } from "next/navigation";
import { ListChecks } from "lucide-react";
import { TaskList } from "@/components/features/task-list";
import { TaskCatalogPicker } from "@/components/features/task-catalog-picker";
import { PageHeader } from "@/components/ui/page-header";

import type { Task } from "@prisma/client";

interface TasksPageContentProps {
  tasks: Task[];
}

export function TasksPageContent({ tasks }: TasksPageContentProps) {
  const router = useRouter();

  return (
    <>
      <PageHeader
        backButton
        icon={ListChecks}
        title="Tareas"
        subtitle="Gestiona las tareas de tu hogar"
        actions={
          <TaskCatalogPicker
            existingTaskNames={tasks.map((t) => t.name)}
            onTasksCreated={() => router.refresh()}
          />
        }
      />

      <TaskList tasks={tasks} />
    </>
  );
}
