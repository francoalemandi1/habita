"use client";

import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { openAnotar } from "@/components/features/anotar/anotar-events";
import { IntentLink } from "@/components/features/intent-link";
import { cn } from "@/lib/utils";
import { APP_PLACES, resolveActivePlace } from "./app-places";

import type { SidebarItem } from "@/components/ds/sidebar";

/** Mobile (below md) tab bar: the same 4 places with the central "+" that opens Anotar (§5.1, no "more" menu). */
export function AppNavMobile() {
  const pathname = usePathname();
  const activePlace = resolveActivePlace(pathname);

  return (
    <nav
      aria-label="Lugares"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
        {APP_PLACES.slice(0, 2).map((place) => (
          <TabLink key={place.id} place={place} isActive={place.id === activePlace} />
        ))}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => openAnotar()}
            aria-label="Anotar"
            className="flex size-12 items-center justify-center rounded-[14px] bg-monte text-paper transition-[background-color,transform] duration-100 touch-manipulation active:scale-[.94] active:bg-monte-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            <Plus className="size-6" strokeWidth={2} />
          </button>
        </div>
        {APP_PLACES.slice(2).map((place) => (
          <TabLink key={place.id} place={place} isActive={place.id === activePlace} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({ place, isActive }: { place: SidebarItem; isActive: boolean }) {
  const Icon = place.icon;
  return (
    <IntentLink
      href={place.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[12px] touch-manipulation transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monte",
        isActive ? "text-ink" : "text-ink-2"
      )}
    >
      <Icon className={cn("size-[22px]", isActive && "text-monte")} strokeWidth={1.75} aria-hidden="true" />
      <span className={cn("text-[11px] leading-tight", isActive ? "font-semibold" : "font-medium")}>{place.label}</span>
    </IntentLink>
  );
}
