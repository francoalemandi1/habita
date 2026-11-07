"use client";

import { useDroppable } from "@dnd-kit/core";
import { Avatar } from "@/components/ds/avatar";
import { encodeDropTargetId } from "@/lib/tareas-week";
import { cn } from "@/lib/utils";

interface WeekMemberStripProps {
  members: ReadonlyArray<{ id: string; name: string }>;
  currentMemberId: string;
}

/** Avatar row — a drop target for "arrastrar tarea web A" onto a person (handoff §7). */
export function WeekMemberStrip({ members, currentMemberId }: WeekMemberStripProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-center gap-6 py-2">
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
      className={cn("flex flex-col items-center gap-1 rounded-[14px] p-1.5 transition-transform", isOver && "scale-110 ring-2 ring-monte")}
    >
      <Avatar name={member.name} size={28} isSelf={isSelf} />
      <span className="text-[11px] text-ink-2">{member.name.split(" ")[0]}</span>
    </div>
  );
}
