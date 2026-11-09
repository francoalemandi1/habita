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

export interface TaskCardActions {
  onToggleComplete: () => void;
  onEdit: () => void;
  onChangeDay: () => void;
  onPasar: () => void;
  onToggleRotation: () => void;
  onDelete: () => void;
}

export interface TaskCardProps extends TaskCardActions {
  assignment: WeekAssignment;
  currentMemberId: string;
  pendingTransferToName: string | null;
  isRotating: boolean;
  isSyncPending: boolean;
  /** "card" = compact tile inside a web day column; "row" = full-width list row (mobile). */
  variant?: "card" | "row";
}

interface DragBinding {
  setNodeRef: (element: HTMLElement | null) => void;
  handleProps: React.HTMLAttributes<HTMLButtonElement>;
  style?: React.CSSProperties;
  isDragging: boolean;
}

function buildMenuItems(props: TaskCardProps, isOwn: boolean): ContextMenuItemConfig[] {
  return [
    { id: "edit", label: "Editar", icon: Pencil, onSelect: props.onEdit },
    { id: "change-day", label: "Cambiar día", icon: CalendarClock, onSelect: props.onChangeDay },
    ...(isOwn ? [{ id: "pasar", label: "Pasar a alguien", icon: ArrowRightLeft, onSelect: props.onPasar }] : []),
    {
      id: "rotation",
      label: props.isRotating ? "Quitar rotación" : "Hacer rotación",
      icon: Repeat,
      onSelect: props.onToggleRotation,
    },
    { id: "delete", label: "Eliminar", icon: Trash2, onSelect: props.onDelete, destructive: true },
  ];
}

/** One assignment: checkbox (pattern A), name + meta, assignee avatar, context menu (§5.3 Tareas). */
export function TaskCard(props: TaskCardProps & { drag?: DragBinding }): React.JSX.Element {
  const { assignment, currentMemberId, pendingTransferToName, isSyncPending, variant = "card", drag } = props;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isOwn = assignment.memberId === currentMemberId;
  const checkboxState = checkboxStateForAssignment(assignment.status, assignment.member.memberType);
  const isDone = checkboxState === "done";
  const isRow = variant === "row";

  const menu = (
    <ContextMenu
      open={isMenuOpen}
      onOpenChange={setIsMenuOpen}
      items={buildMenuItems(props, isOwn)}
      trigger={
        <button
          type="button"
          aria-label={`Más acciones para ${assignment.task.name}`}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-[8px] text-ink-2 outline-none hover:bg-sand hover:text-ink focus-visible:ring-2 focus-visible:ring-monte",
            // Web tiles are narrow: the menu takes the avatar's place on hover/focus instead of its own column.
            !isRow && "absolute right-1.5 top-1/2 -translate-y-1/2 bg-surface opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
          )}
        >
          <MoreHorizontal className="size-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      }
    />
  );

  return (
    <div
      ref={drag?.setNodeRef}
      style={drag?.style}
      onContextMenu={(event) => {
        event.preventDefault();
        setIsMenuOpen(true);
      }}
      className={cn(
        "group relative flex items-center",
        isRow ? "gap-3 py-3" : "gap-1.5 rounded-[14px] bg-surface py-1.5 pl-1 pr-2",
        drag?.isDragging && "z-10 opacity-60 shadow-level-1",
      )}
    >
      <Checkbox
        state={checkboxState}
        label={assignment.task.name}
        onToggle={props.onToggleComplete}
        transferredLabel={isRow ? pendingTransferToName ?? undefined : undefined}
        className={isRow ? undefined : "-my-1.5 size-9"}
      />
      <button
        type="button"
        {...drag?.handleProps}
        onClick={props.onEdit}
        aria-label={`${assignment.task.name}, editar`}
        title={assignment.task.name}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-start rounded-[6px] text-left outline-none focus-visible:ring-2 focus-visible:ring-monte",
          drag && "cursor-grab active:cursor-grabbing",
        )}
      >
        <span className="flex min-w-0 max-w-full items-center gap-1.5 py-0.5">
          <span
            className={cn(
              "font-medium",
              isRow ? "truncate text-[16px]" : "line-clamp-2 hyphens-auto text-[14px] leading-snug",
              isDone ? "text-ink-3 line-through decoration-ink-3" : "text-ink",
            )}
          >
            {assignment.task.name}
          </span>
          {isSyncPending && <PendingDot />}
        </span>
        {(isRow || pendingTransferToName) && (
          <span className={cn("max-w-full truncate text-ink-2", isRow ? "text-[13px]" : "text-[12px]")}>
            {formatTaskCardMeta(assignment.task, pendingTransferToName)}
          </span>
        )}
      </button>
      <Avatar
        name={assignment.member.name}
        size={isRow ? 28 : 22}
        isSelf={isOwn}
        ringBackground="var(--color-surface)"
        title={assignment.member.name}
        className={cn(!isRow && "transition-opacity duration-100 group-hover:opacity-0")}
      />
      {menu}
    </div>
  );
}

/** Web day columns: the name is the drag handle (drop on another day or person = pattern A with Deshacer). */
export function DraggableTaskCard(props: TaskCardProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: props.assignment.id });
  const drag: DragBinding = {
    setNodeRef,
    handleProps: { ...attributes, ...listeners },
    style: transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined,
    isDragging,
  };
  return <TaskCard {...props} drag={drag} />;
}
