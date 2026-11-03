"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardCheck, Receipt, ShoppingCart, PenLine } from "lucide-react";
import { APP_ROUTES } from "@habita/contracts";
import { ANOTAR_OPEN_EVENT } from "@/components/features/anotar/anotar-events";
import { cn } from "@/lib/utils";

const PLACES = [
  { href: APP_ROUTES.casa, icon: Home, label: "Casa" },
  { href: APP_ROUTES.tareas, icon: ClipboardCheck, label: "Tareas" },
  { href: APP_ROUTES.plata, icon: Receipt, label: "Plata" },
  { href: APP_ROUTES.super, icon: ShoppingCart, label: "Súper" },
];

/** Mobile (below md) bottom tab bar: same 4 places + a central "Anotar" button, no "more" menu. */
export function AppNavMobile() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] z-50 md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around rounded-2xl bg-card px-2 py-1.5 shadow-lg">
        {PLACES.slice(0, 2).map((item) => (
          <TabLink key={item.href} item={item} isActive={pathname.startsWith(item.href)} />
        ))}

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(ANOTAR_OPEN_EVENT))}
          aria-label="Anotar"
          className="flex items-center justify-center rounded-full bg-primary p-3 text-primary-foreground shadow-md transition-transform touch-manipulation active:scale-95"
        >
          <PenLine className="h-5 w-5" strokeWidth={1.75} />
        </button>

        {PLACES.slice(2).map((item) => (
          <TabLink key={item.href} item={item} isActive={pathname.startsWith(item.href)} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({
  item,
  isActive,
}: {
  item: { href: string; icon: typeof Home; label: string };
  isActive: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-all duration-200 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
      <span className={cn("text-[10px] leading-tight", isActive ? "font-semibold" : "font-medium")}>
        {item.label}
      </span>
    </Link>
  );
}
