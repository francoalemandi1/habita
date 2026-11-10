"use client";

import { useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { isSameDay } from "@/lib/calendar-utils";
import { WeekDayColumn } from "./week-day-column";
import { WeekMemberStrip } from "./week-member-strip";

import type { DragEndEvent } from "@dnd-kit/core";
import type { WeekAssignment } from "@/hooks/use-week-assignments";
import type { TaskCardProps } from "./task-card";

// A small travel threshold keeps a plain click on the task name working as "Editar".
const DRAG_ACTIVATION_DISTANCE_PX = 6;

interface SemanaBoardProps {
  weekDays: readonly Date[];
  assignmentsByDay: ReadonlyArray<readonly WeekAssignment[]>;
  members: ReadonlyArray<{ id: string; name: string }>;
  currentMemberId: string;
  getCardProps: (assignment: WeekAssignment) => TaskCardProps;
  onDragEnd: (event: DragEndEvent) => void;
}

/** Web Semana: 7 day columns; dragging a task reveals the people strip to reassign it. */
export function SemanaBoard({ weekDays, assignmentsByDay, members, currentMemberId, getCardProps, onDragEnd }: SemanaBoardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX } }),
    useSensor(KeyboardSensor),
  );
  const today = new Date();

  function handleDragEnd(event: DragEndEvent): void {
    setIsDragging(false);
    onDragEnd(event);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={() => setIsDragging(true)}
      onDragCancel={() => setIsDragging(false)}
      onDragEnd={handleDragEnd}
    >
      <div className="relative">
        {isDragging && members.length > 1 && (
          <div className="pointer-events-none sticky top-3 z-20 flex justify-center pb-3">
            <div className="pointer-events-auto">
              <WeekMemberStrip members={members} currentMemberId={currentMemberId} />
            </div>
          </div>
        )}
        <div className="-mx-1 overflow-x-auto px-1 pb-1"><div className="grid min-w-[1050px] grid-cols-7 gap-2">
          {weekDays.map((day, index) => (
            <WeekDayColumn
              key={day.toISOString()}
              day={day}
              isToday={isSameDay(day, today)}
              assignments={assignmentsByDay[index] ?? []}
              getCardProps={getCardProps}
            />
          ))}
          </div>
        </div>
      </div>
    </DndContext>
  );
}
