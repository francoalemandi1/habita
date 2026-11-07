"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CalendarClock, ArrowRightLeft, Repeat, Trash2, Pencil, MoreHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ds/checkbox";
import { Avatar } from "@/components/ds/avatar";
import { PendingDot } from "@/components/ds/pending-dot";
import { ContextMenu } from "@/components/ds/context-menu";
import { checkboxStateForAssignment } from "@/components/features/casa/casa-logic";
import { formatTaskCardMeta } from "@/lib/tareas-week";
import { cn } from "@/lib/utils";

import type { WeekAssignment } from "@/hooks/use-week-assignments";
import type { ContextMenuItemConfig } from "@/components/ds/context-menu";

interface TaskCardProps {
  assignment: WeekAssignment;
  currentMemberId: string;
  pendingTransferToName: string | null;
  isRotating: boolean;
  isSyncPending: boolean;
  onToggleComplete: () => void;
  onEdit: () => void;
  onChangeDay: () => void;
  onPasar: () => void;
  onToggleRotation: () => void;
  onDelete: () => void;
}

/** A single assignment card in the Semana grid — checkbox, name, meta, assignee avatar (handoff §6 "Tareas"). */
export function TaskCard({
  assignment,
  currentMemberId,
  pendingTransferToName,
  isRotating,
  isSyncPending,
  onToggleComplete,
  onEdit,
  onChangeDay,
  onPasar,
  onToggleRotation,
  onDelete,
}: TaskCardProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: assignment.id });

  const checkboxState = checkboxStateForAssignment(assignment.status, assignment.member.memberType);
  const meta = formatTaskCardMeta(assignment.task, pendingTransferToName);
  const isOwn = assignment.memberId === currentMemberId;

  const menuItems: ContextMenuItemConfig[] = [
    { id: "edit", label: "Editar", icon: Pencil, onSelect: onEdit },
    { id: "change-day", label: "Cambiar día", icon: CalendarClock, onSelect: onChangeDay },
    ...(isOwn ? [{ id: "pasar", label: "Pasar a alguien", icon: ArrowRightLeft, onSelect: onPasar }] : []),
    {
      id: "rotation",
      label: isRotating ? "Quitar rotación" : "Hacer rotación",
      icon: Repeat,
      onSelect: onToggleRotation,
    },
    { id: "delete", label: "Eliminar", icon: Trash2, onSelect: onDelete, destructive: true },
  ];

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        "flex items-center gap-2 rounded-[14px] bg-surface px-2.5 py-2 shadow-level-1",
        isDragging && "opacity-50",
      )}
    >
      <Checkbox state={checkboxState} onToggle={onToggleComplete} transferredLabel={pendingTransferToName ?? undefined} />
      <button
        type="button"
        {...listeners}
        {...attributes}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[14px] font-medium text-ink">{assignment.task.name}</span>
          {isSyncPending && <PendingDot />}
        </span>
        <span className="truncate text-[12px] text-ink-2">{meta}</span>
      </button>
      <Avatar name={assignment.member.name} size={22} isSelf={isOwn} />
      <ContextMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        items={menuItems}
        trigger={
          <button type="button" aria-label="Más acciones" className="flex size-7 shrink-0 items-center justify-center text-ink-2">
            <MoreHorizontal className="size-4" strokeWidth={1.75} />
          </button>
        }
      />
    </div>
  );
}
