import { Avatar } from "@/components/ds/avatar";

export interface ProfileHeaderProps {
  memberName: string;
  email: string | null;
}

/** §5.3 Perfil — avatar 56 + name + email, top of the screen. */
export function ProfileHeader({ memberName, email }: ProfileHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <Avatar name={memberName} size={56} isSelf />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[20px] font-bold text-ink">{memberName}</span>
        {email && <span className="truncate text-[14px] text-ink-2">{email}</span>}
      </div>
    </div>
  );
}
