"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/ds/sidebar";
import { HouseholdSwitcher } from "@/components/features/household-switcher";
import { APP_ROUTES } from "@habita/contracts";
import { openAnotar } from "@/components/features/anotar/anotar-events";
import { APP_PLACES, resolveActivePlace } from "./app-places";

import type { SidebarLinkRender } from "@/components/ds/sidebar";

interface HouseholdOption {
  id: string;
  name: string;
}

export interface AppNavProps {
  household: { name: string };
  member: { name: string };
  households: HouseholdOption[];
  currentHouseholdId: string;
  hasUnreadNotifications: boolean;
}

function renderNextLink({ href, children, className, ariaLabel, isCurrent }: SidebarLinkRender): React.ReactNode {
  return (
    <Link href={href} aria-label={ariaLabel} aria-current={isCurrent ? "page" : undefined} className={className}>
      {children}
    </Link>
  );
}

/** Desktop (md+) shell nav: §6.15 240px sidebar, sticky so it stays put while the page scrolls. */
export function AppNav({ household, member, households, currentHouseholdId, hasUnreadNotifications }: AppNavProps) {
  const pathname = usePathname();
  const householdSlot =
    households.length > 1 ? (
      <HouseholdSwitcher households={households} currentHouseholdId={currentHouseholdId} />
    ) : undefined;

  return (
    <div className="sticky top-0 hidden h-dvh shrink-0 md:block">
      <Sidebar
        items={APP_PLACES}
        active={resolveActivePlace(pathname)}
        household={household}
        member={member}
        onAnotar={() => openAnotar()}
        householdSlot={householdSlot}
        profileHref={APP_ROUTES.perfil}
        notificationsHref={APP_ROUTES.avisos}
        isProfileActive={pathname.startsWith(APP_ROUTES.perfil)}
        hasUnreadNotifications={hasUnreadNotifications && !pathname.startsWith(APP_ROUTES.avisos)}
        renderLink={renderNextLink}
      />
    </div>
  );
}
