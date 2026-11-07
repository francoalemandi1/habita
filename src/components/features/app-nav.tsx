"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, Receipt, ShoppingCart, Home } from "lucide-react";
import { Sidebar } from "@/components/ds/sidebar";
import { HouseholdSwitcher } from "@/components/features/household-switcher";
import { APP_ROUTES } from "@habita/contracts";
import { ANOTAR_OPEN_EVENT } from "@/components/features/anotar/anotar-events";

import type { SidebarItem } from "@/components/ds/sidebar";

const PLACES: SidebarItem[] = [
  { id: "casa", label: "Casa", icon: Home, href: APP_ROUTES.casa },
  { id: "tareas", label: "Tareas", icon: ClipboardCheck, href: APP_ROUTES.tareas },
  { id: "plata", label: "Plata", icon: Receipt, href: APP_ROUTES.plata },
  { id: "super", label: "Súper", icon: ShoppingCart, href: APP_ROUTES.super },
];

interface HouseholdOption {
  id: string;
  name: string;
}

interface AppNavProps {
  household: { name: string };
  member: { name: string };
  households: HouseholdOption[];
  currentHouseholdId: string;
}

/** Desktop (md+) shell nav: §6.15 240px sidebar. */
export function AppNav({ household, member, households, currentHouseholdId }: AppNavProps) {
  const pathname = usePathname();
  const active = PLACES.find((item) => pathname.startsWith(item.href))?.id ?? "casa";
  const householdSlot =
    households.length > 1 ? (
      <HouseholdSwitcher households={households} currentHouseholdId={currentHouseholdId} className="w-full" />
    ) : undefined;

  return (
    <div className="hidden h-screen shrink-0 md:block">
      <Sidebar
        items={PLACES}
        active={active}
        household={household}
        member={member}
        onAnotar={() => window.dispatchEvent(new Event(ANOTAR_OPEN_EVENT))}
        householdSlot={householdSlot}
        profileHref={APP_ROUTES.perfil}
        notificationsHref={APP_ROUTES.avisos}
        renderLink={(href, children, ariaLabel) => (
          <Link href={href} aria-label={ariaLabel}>
            {children}
          </Link>
        )}
      />
    </div>
  );
}
