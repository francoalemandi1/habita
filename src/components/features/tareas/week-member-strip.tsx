"use client";

import { useDroppable } from "@dnd-kit/core";
import { Avatar } from "@/components/ds/avatar";
import { encodeDropTargetId } from "@/lib/tareas-week";
import { cn } from "@/lib/utils";

interface WeekMemberStripProps {
  members: ReadonlyArray<{ id: string; name: string }>;
  currentMemberId: string;
}

/** Shown only while dragging: drop a task on a person to reassign it ("arrastrar tarea web A", handoff §7). */
export function WeekMemberStrip({ members, currentMemberId }: WeekMemberStripProps): React.JSX.Element {
  return (
    <div className="animate-content-in flex items-center gap-3 rounded-[16px] bg-surface px-4 py-2 shadow-level-1">
      <span className="text-[13px] text-ink-2">Soltala sobre alguien para pasársela</span>
      {members.map((member) => (
        <MemberDropTarget key={member.id} member={member} isSelf={member.id === currentMemberId} />
      ))}
    </div>
  );
}

function MemberDropTarget({ member, isSelf }: { member: { id: string; name: string }; isSelf: boolean }): React.JSX.Element {
  const dropId = encodeDropTargetId({ kind: "member", memberId: member.id });
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-[transform,background-color] duration-100",
        isOver ? "scale-105 bg-monte-soft ring-2 ring-monte" : "bg-paper",
      )}
    >
      <Avatar name={member.name} size={28} isSelf={isSelf} />
      <span className="max-w-[120px] truncate text-[13px] font-medium text-ink">{member.name}</span>
    </div>
  );
}
