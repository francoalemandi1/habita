import { Bell, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

import type { LucideIcon } from "lucide-react";

export interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

export interface SidebarProps {
  items: SidebarItem[];
  active: string;
  household: { name: string };
  member: { name: string };
  onAnotar: () => void;
  onSwitchHousehold?: () => void;
  /** Replaces the household row, e.g. with a real switcher control. */
  householdSlot?: React.ReactNode;
  profileHref?: string;
  notificationsHref?: string;
  /** Rendering as a plain anchor keeps this component routing-agnostic (R3 wires navigation). */
  renderLink?: (href: string, children: React.ReactNode, ariaLabel?: string) => React.ReactNode;
}

function renderPlainAnchor(href: string, children: React.ReactNode, ariaLabel?: string): React.ReactNode {
  return <a href={href} aria-label={ariaLabel}>{children}</a>;
}

/** §6.15 — 240px shell, visual only; R3 wires real routing + the "N" shortcut. */
export function Sidebar({
  items,
  active,
  household,
  member,
  onAnotar,
  onSwitchHousehold,
  householdSlot,
  profileHref,
  notificationsHref,
  renderLink = renderPlainAnchor,
}: SidebarProps): React.JSX.Element {
  const profile = (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={member.name} size={28} />
      <span className="truncate text-[15px] text-ink">{member.name}</span>
    </span>
  );
  const bell = <Bell className="size-5 text-ink-2" strokeWidth={1.75} />;

  return (
    <aside className="flex h-full w-60 flex-col border-r border-line px-4 py-6">
      <div className="flex items-center gap-2 px-2">
        <div className="size-7 rounded-full bg-monte" aria-hidden="true" />
        <span className="text-[26px] font-bold text-ink">habita</span>
      </div>

      <div className="mt-5">
        {householdSlot ?? (
          <button
            type="button"
            onClick={onSwitchHousehold}
            disabled={!onSwitchHousehold}
            className="flex w-full items-center justify-between rounded-[12px] bg-surface px-3 py-2.5 text-left"
          >
            <span className="truncate text-[15px] font-medium text-ink">{household.name}</span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onAnotar}
        className="mt-3 flex items-center justify-between rounded-[12px] bg-monte px-3 py-2.5 text-paper"
      >
        <span className="flex items-center gap-2 text-[15px] font-semibold">
          <PenLine className="size-4" strokeWidth={1.75} />
          Anotar
        </span>
        <kbd className="rounded-[6px] bg-monte-pressed px-1.5 py-0.5 text-[11px]">N</kbd>
      </button>

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;
          const content = (
            <span
              className={cn(
                "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[15px]",
                isActive ? "bg-surface font-semibold text-ink" : "text-ink-2"
              )}
            >
              <Icon className={cn("size-5", isActive && "text-monte")} strokeWidth={1.75} />
              {item.label}
            </span>
          );
          return <div key={item.id}>{renderLink(item.href, content)}</div>;
        })}
      </nav>

      <div className="flex items-center justify-between gap-2.5 border-t border-line pt-4">
        {profileHref ? renderLink(profileHref, profile, "Perfil y ajustes") : profile}
        {notificationsHref ? renderLink(notificationsHref, bell, "Avisos") : bell}
      </div>
    </aside>
  );
}
