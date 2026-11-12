"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CalendarClock, ArrowRightLeft, Repeat, Trash2, Pencil, MoreHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ds/checkbox";
import { Avatar } from "@/components/ds/avatar";
import { PendingDot } from "@/components/ds/pending-dot";
import { ContextMenu } from "@/components/ds/context-menu";
import { checkboxStateForAssignment } from "@/components/features/casa/casa-logic";
import { formatAssignmentDayLabel, formatTaskCardMeta } from "@/lib/tareas-week";
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
  const dayLabel = formatAssignmentDayLabel(new Date(assignment.dueDate));

  const menu = (
    <ContextMenu
      open={isMenuOpen}
      onOpenChange={setIsMenuOpen}
      items={buildMenuItems(props, isOwn)}
      trigger={
        <button
          type="button"
          aria-label={`Más acciones para ${assignment.task.name}, ${dayLabel}`}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-[8px] text-ink-2 outline-none hover:bg-sand hover:text-ink focus-visible:ring-2 focus-visible:ring-monte",
            !isRow && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
          )}
        >
          <MoreHorizontal className="size-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      }
    />
  );

  if (isRow) {
    return (
      <div
        onContextMenu={(event) => {
          event.preventDefault();
          setIsMenuOpen(true);
        }}
        className="group relative flex items-center gap-3 py-3"
      >
        <Checkbox
          state={checkboxState}
          label={assignment.task.name}
          onToggle={props.onToggleComplete}
          transferredLabel={pendingTransferToName ?? undefined}
        />
        <button
          type="button"
          onClick={props.onEdit}
          aria-label={`${assignment.task.name}, editar`}
          title={assignment.task.name}
          className="flex min-w-0 flex-1 flex-col items-start rounded-[6px] text-left outline-none focus-visible:ring-2 focus-visible:ring-monte"
        >
          <span className="flex min-w-0 max-w-full items-center gap-1.5 py-0.5">
            <span className={cn("truncate text-[16px] font-medium", isDone ? "text-ink-2 line-through decoration-ink-3" : "text-ink")}>
              {assignment.task.name}
            </span>
            {isSyncPending && <PendingDot />}
          </span>
          <span className="max-w-full truncate text-[13px] text-ink-2">
            {formatTaskCardMeta(assignment.task, pendingTransferToName)}
          </span>
        </button>
        <Avatar name={assignment.member.name} size={28} isSelf={isOwn} ringBackground="var(--color-surface)" title={assignment.member.name} />
        {menu}
      </div>
    );
  }

  return (
    <div
      ref={drag?.setNodeRef}
      style={drag?.style}
      onContextMenu={(event) => {
        event.preventDefault();
        setIsMenuOpen(true);
      }}
      className={cn(
        "group relative flex flex-col gap-1 rounded-[14px] bg-surface p-2",
        drag?.isDragging && "z-10 opacity-60 shadow-level-1",
      )}
    >
      <div className="flex items-start gap-1.5">
        <Checkbox state={checkboxState} label={assignment.task.name} onToggle={props.onToggleComplete} className="-my-1 size-9" />
        <button
          type="button"
          {...drag?.handleProps}
          onClick={props.onEdit}
          aria-label={`${assignment.task.name}, editar`}
          title={assignment.task.name}
          className={cn(
            "min-w-0 flex-1 rounded-[6px] py-0.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-monte",
            drag && "cursor-grab active:cursor-grabbing",
          )}
        >
          <span
            className={cn(
              "line-clamp-3 text-[13.5px] font-medium leading-snug hyphens-auto",
              isDone ? "text-ink-2 line-through decoration-ink-3" : "text-ink",
            )}
          >
            {assignment.task.name}
          </span>
          {isSyncPending && <PendingDot className="ml-1 inline-block align-middle" />}
        </button>
      </div>
      <div className="flex items-center gap-1.5 pl-[7px]">
        <Avatar name={assignment.member.name} size={22} isSelf={isOwn} ringBackground="var(--color-surface)" title={assignment.member.name} />
        {pendingTransferToName ? (
          <span className="truncate text-[12px] text-ink-2">{formatTaskCardMeta(assignment.task, pendingTransferToName)}</span>
        ) : (
          assignment.task.estimatedMinutes && (
            <span className="shrink-0 whitespace-nowrap text-[12px] text-ink-2">{assignment.task.estimatedMinutes} min</span>
          )
        )}
        <span className="flex-1" />
        {menu}
      </div>
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
