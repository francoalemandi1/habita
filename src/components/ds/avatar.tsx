import { cn } from "@/lib/utils";
import { RAW_COLORS } from "./lib/raw-colors";

export type AvatarSize = 56 | 40 | 28 | 22;

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: AvatarSize;
  /** The signed-in member's own avatar gets a Monte ring (§6.10). */
  isSelf?: boolean;
  /** Background the ring is drawn against; defaults to the page background. */
  ringBackground?: string;
  /** Seniority rank (0 = oldest member) picks the fade step inside groups. */
  seniorityRank?: number;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  56: "size-14 text-xl",
  40: "size-10 text-base",
  28: "size-7 text-sm",
  22: "size-[22px] text-xs",
};

/** §6.10 — fixed fade order by seniority: full ink, then ink2, then the faded gray (no Tailwind token). */
const SENIORITY_TEXT_CLASSES = ["text-ink", "text-ink-2", ""];
const SENIORITY_FALLBACK_COLOR = RAW_COLORS.fadedBorder;

export function Avatar({
  name,
  size = 40,
  isSelf = false,
  ringBackground = "var(--color-paper)",
  seniorityRank,
  className,
  style,
  ...props
}: AvatarProps): React.JSX.Element {
  const initial = name.trim().charAt(0).toUpperCase();
  const rankIndex = seniorityRank !== undefined ? Math.min(seniorityRank, SENIORITY_TEXT_CLASSES.length - 1) : 0;
  const textClass = seniorityRank !== undefined ? SENIORITY_TEXT_CLASSES[rankIndex] : "text-ink";
  const needsFallbackColor = seniorityRank !== undefined && rankIndex === SENIORITY_TEXT_CLASSES.length - 1;

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-line font-semibold",
        SIZE_CLASSES[size],
        textClass,
        className
      )}
      style={{
        ...(needsFallbackColor ? { color: SENIORITY_FALLBACK_COLOR } : {}),
        ...(isSelf ? { boxShadow: `0 0 0 2px ${ringBackground}, 0 0 0 3.5px var(--color-monte)` } : {}),
        ...style,
      }}
      aria-label={name}
      {...props}
    >
      {initial}
    </div>
  );
}

export interface AvatarGroupProps {
  members: Array<{ id: string; name: string }>;
  size?: AvatarSize;
  max?: number;
}

/** §6.10 — overlapped with -8 spacing, fixed fade order by seniority. */
export function AvatarGroup({ members, size = 28, max = 4 }: AvatarGroupProps): React.JSX.Element {
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;

  return (
    <div className="flex items-center">
      {visible.map((member, index) => (
        <Avatar
          key={member.id}
          name={member.name}
          size={size}
          seniorityRank={index}
          className={cn("ring-2 ring-paper", index > 0 && "-ml-2")}
        />
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "-ml-2 flex items-center justify-center rounded-full bg-sand text-ink-2 ring-2 ring-paper",
            SIZE_CLASSES[size]
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
