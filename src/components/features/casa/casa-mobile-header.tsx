import Link from "next/link";
import { Bell } from "lucide-react";
import { APP_ROUTES } from "@habita/contracts";
import { Avatar } from "@/components/ds/avatar";
import { HabitaLogo } from "@/components/ds/habita-logo";

interface CasaMobileHeaderProps {
  householdName: string;
  memberName: string;
  hasUnreadNotifications: boolean;
}

const ICON_BUTTON =
  "relative flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-monte";

/**
 * Casa header below `md` (§5.3 Casa, Design System §09): logo + house, bell with the
 * Ladrillo dot, own avatar. It is the mobile-web way into Avisos and Perfil.
 */
export function CasaMobileHeader({ householdName, memberName, hasUnreadNotifications }: CasaMobileHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 md:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <HabitaLogo size={26} />
        <span className="truncate text-[16px] font-semibold text-ink">{householdName}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={APP_ROUTES.avisos}
          aria-label={hasUnreadNotifications ? "Avisos, hay novedades" : "Avisos"}
          className={`${ICON_BUTTON} text-ink-2`}
        >
          <Bell className="size-[22px]" strokeWidth={1.75} aria-hidden="true" />
          {hasUnreadNotifications && (
            <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-ladrillo ring-2 ring-paper" />
          )}
        </Link>
        <Link href={APP_ROUTES.perfil} aria-label="Perfil y ajustes" className={ICON_BUTTON}>
          <Avatar name={memberName} size={28} isSelf aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
