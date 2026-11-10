import { Bell, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { HabitaLogo } from "./habita-logo";

import type { LucideIcon } from "lucide-react";

export interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

export interface SidebarProps {
  items: SidebarItem[];
  /** Id of the active place, or null when the current screen is not one of the four places (Perfil, Avisos). */
  active: string | null;
  household: { name: string };
  member: { name: string };
  onAnotar: () => void;
  /** Replaces the household row, e.g. with a real switcher control. */
  householdSlot?: React.ReactNode;
  profileHref?: string;
  notificationsHref?: string;
  isProfileActive?: boolean;
  hasUnreadNotifications?: boolean;
  /** Rendering as a plain anchor keeps this component routing-agnostic. */
  renderLink?: (link: SidebarLinkRender) => React.ReactNode;
}

export interface SidebarLinkRender {
  href: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  isCurrent?: boolean;
}

const FOCUS_RING = "outline-none focus-visible:ring-2 focus-visible:ring-monte focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

function renderPlainAnchor({ href, children, className, ariaLabel, isCurrent }: SidebarLinkRender): React.ReactNode {
  return (
    <a href={href} aria-label={ariaLabel} aria-current={isCurrent ? "page" : undefined} className={className}>
      {children}
    </a>
  );
}

/** §6.15 — 240px shell: logo, household, Anotar (N), the four places, profile + bell footer. */
export function Sidebar({
  items,
  active,
  household,
  member,
  onAnotar,
  householdSlot,
  profileHref,
  notificationsHref,
  isProfileActive = false,
  hasUnreadNotifications = false,
  renderLink = renderPlainAnchor,
}: SidebarProps): React.JSX.Element {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-line px-4 py-6">
      <div className="flex items-center gap-2 px-2">
        <HabitaLogo size={28} />
        <span className="text-[26px] font-bold leading-none tracking-[-.03em] text-ink">habita</span>
      </div>

      <div className="mt-6">
        {householdSlot ?? (
          <div className="truncate rounded-[12px] bg-surface px-3 py-2.5 text-[15px] font-medium text-ink">
            {household.name}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onAnotar}
        className={cn(
          "mt-3 flex items-center justify-between rounded-[12px] bg-monte px-3 py-2.5 text-paper transition-[background-color,transform] duration-100 hover:bg-monte-pressed active:scale-[.97]",
          FOCUS_RING
        )}
      >
        <span className="flex items-center gap-2 text-[15px] font-semibold">
          <Plus className="size-[18px]" strokeWidth={2} />
          Anotar
        </span>
        <kbd className="rounded-[6px] bg-monte-pressed px-1.5 py-0.5 font-sans text-[11px] font-semibold">N</kbd>
      </button>

      <nav aria-label="Lugares" className="mt-6 flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <SidebarPlace key={item.id} item={item} isActive={item.id === active} renderLink={renderLink} />
        ))}
      </nav>

      <SidebarFooter
        member={member}
        profileHref={profileHref}
        notificationsHref={notificationsHref}
        isProfileActive={isProfileActive}
        hasUnreadNotifications={hasUnreadNotifications}
        renderLink={renderLink}
      />
    </aside>
  );
}

interface SidebarPlaceProps {
  item: SidebarItem;
  isActive: boolean;
  renderLink: (link: SidebarLinkRender) => React.ReactNode;
}

function SidebarPlace({ item, isActive, renderLink }: SidebarPlaceProps): React.ReactNode {
  const Icon = item.icon;
  return renderLink({
    href: item.href,
    isCurrent: isActive,
    className: cn(
      "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[15px] transition-colors duration-100",
      isActive ? "bg-surface font-semibold text-ink" : "text-ink-2 hover:bg-surface/60 hover:text-ink",
      FOCUS_RING
    ),
    children: (
      <>
        <Icon className={cn("size-5", isActive && "text-monte")} strokeWidth={1.75} aria-hidden="true" />
        {item.label}
      </>
    ),
  });
}

interface SidebarFooterProps {
  member: { name: string };
  profileHref?: string;
  notificationsHref?: string;
  isProfileActive: boolean;
  hasUnreadNotifications: boolean;
  renderLink: (link: SidebarLinkRender) => React.ReactNode;
}

function SidebarFooter({
  member,
  profileHref,
  notificationsHref,
  isProfileActive,
  hasUnreadNotifications,
  renderLink,
}: SidebarFooterProps): React.JSX.Element {
  const profile = (
    <>
      <Avatar name={member.name} size={28} isSelf ringBackground="var(--color-paper)" aria-hidden="true" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[14px] font-medium leading-tight text-ink">{member.name}</span>
        <span className="text-[12px] leading-tight text-ink-2">Ajustes</span>
      </span>
    </>
  );
  const bell = (
    <>
      <Bell className="size-5" strokeWidth={1.75} aria-hidden="true" />
      {hasUnreadNotifications && <span className="absolute right-2 top-2 size-2 rounded-full bg-ladrillo ring-2 ring-paper" />}
    </>
  );
  const profileClass = cn(
    "flex min-w-0 flex-1 items-center gap-2.5 rounded-[12px] px-2 py-2 transition-colors duration-100",
    isProfileActive ? "bg-surface" : "hover:bg-surface/60",
    FOCUS_RING
  );
  const bellClass = cn(
    "relative flex size-10 shrink-0 items-center justify-center rounded-[12px] text-ink-2 transition-colors duration-100 hover:bg-surface/60 hover:text-ink",
    FOCUS_RING
  );

  return (
    <div className="flex items-center gap-1 border-t border-line pt-3">
      {profileHref ? (
        renderLink({ href: profileHref, children: profile, className: profileClass, ariaLabel: "Perfil y ajustes", isCurrent: isProfileActive })
      ) : (
        <div className={profileClass}>{profile}</div>
      )}
      {notificationsHref ? (
        renderLink({
          href: notificationsHref,
          children: bell,
          className: bellClass,
          ariaLabel: hasUnreadNotifications ? "Avisos, hay novedades" : "Avisos",
        })
      ) : (
        <div className={bellClass}>{bell}</div>
      )}
    </div>
  );
}
