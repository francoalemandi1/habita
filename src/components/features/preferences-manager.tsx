"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, X } from "lucide-react";

import type { MemberPreference, Task } from "@prisma/client";

interface PreferenceWithTask extends MemberPreference {
  task: Pick<Task, "id" | "name">;
}

interface PreferencesManagerProps {
  preferences: PreferenceWithTask[];
  tasks: Pick<Task, "id" | "name">[];
}

export function PreferencesManager({ preferences, tasks }: PreferencesManagerProps) {
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Filter out tasks that already have a preference
  const preferenceTaskIds = new Set(preferences.map((p) => p.taskId));
  const availableTasks = tasks.filter((t) => !preferenceTaskIds.has(t.id));

  const handleAddPreference = async (preference: "PREFERRED" | "DISLIKED") => {
    if (!selectedTaskId || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTaskId, preference }),
      });

      if (response.ok) {
        setSelectedTaskId("");
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePreference = async (taskId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/preferences?taskId=${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const preferredTasks = preferences.filter((p) => p.preference === "PREFERRED");
  const dislikedTasks = preferences.filter((p) => p.preference === "DISLIKED");

  return (
    <div className="space-y-6">
      {/* Add new preference */}
      <Card>
        <CardHeader>
          <CardTitle>Agregar preferencia</CardTitle>
          <CardDescription>
            Selecciona una tarea y marca si te gusta o no
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Select
              value={selectedTaskId}
              onValueChange={setSelectedTaskId}
              disabled={isLoading || availableTasks.length === 0}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={
                  availableTasks.length === 0
                    ? "Ya configuraste todas las tareas"
                    : "Selecciona una tarea"
                } />
              </SelectTrigger>
              <SelectContent>
                {availableTasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleAddPreference("PREFERRED")}
                disabled={!selectedTaskId || isLoading}
                className="flex-1 sm:flex-none"
              >
                <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
                Me gusta
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAddPreference("DISLIKED")}
                disabled={!selectedTaskId || isLoading}
                className="flex-1 sm:flex-none"
              >
                <ThumbsDown className="mr-2 h-4 w-4 text-red-500" />
                No me gusta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current preferences */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Preferred tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ThumbsUp className="h-5 w-5 text-green-500" />
              Tareas preferidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {preferredTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No has marcado tareas como preferidas
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {preferredTasks.map((pref) => (
                  <Badge
                    key={pref.id}
                    variant="secondary"
                    className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                  >
                    {pref.task.name}
                    <button
                      onClick={() => handleRemovePreference(pref.taskId)}
                      disabled={isLoading}
                      className="ml-1 rounded-full hover:bg-green-200 dark:hover:bg-green-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disliked tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ThumbsDown className="h-5 w-5 text-red-500" />
              Tareas no deseadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dislikedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No has marcado tareas como no deseadas
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {dislikedTasks.map((pref) => (
                  <Badge
                    key={pref.id}
                    variant="secondary"
                    className="flex items-center gap-1 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                  >
                    {pref.task.name}
                    <button
                      onClick={() => handleRemovePreference(pref.taskId)}
                      disabled={isLoading}
                      className="ml-1 rounded-full hover:bg-red-200 dark:hover:bg-red-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
