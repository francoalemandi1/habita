"use client";

import { useDroppable } from "@dnd-kit/core";
import { cyclingColors, cyclingTextColors } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
}

interface TransferDropZoneProps {
  members: Member[];
  currentMemberId: string;
  /** The assignment ID being dragged. Non-null means a drag is active. */
  activeId: string | null;
}

function MemberDropTarget({ member, index }: { member: Member; index: number }) {
  const { isOver, setNodeRef } = useDroppable({ id: member.id });
  const bgColor = cyclingColors[index % cyclingColors.length]!;
  const textColor = cyclingTextColors[index % cyclingTextColors.length]!;
  const initial = member.name.charAt(0).toUpperCase();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col items-center gap-1 transition-transform duration-200",
        isOver && "scale-110",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-200",
          isOver && "ring-2 ring-primary ring-offset-2",
        )}
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {initial}
      </div>
      <span className="text-xs font-medium text-muted-foreground">
        {member.name.split(" ")[0]}
      </span>
    </div>
  );
}

export function TransferDropZone({ members, currentMemberId, activeId }: TransferDropZoneProps) {
  const otherMembers = members.filter((m) => m.id !== currentMemberId);

  if (!activeId || otherMembers.length === 0) return null;

  return (
    <div className="mb-4 animate-fade-in rounded-2xl border border-dashed border-primary/30 bg-brand-cream px-4 py-3">
      <p className="mb-2 text-center text-xs font-medium text-muted-foreground">
        Arrastrá hacia
      </p>
      <div className="flex items-center justify-center gap-6">
        {otherMembers.map((member, index) => (
          <MemberDropTarget key={member.id} member={member} index={index} />
        ))}
      </div>
    </div>
  );
}
