"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, Receipt, ShoppingCart, Compass, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/my-tasks", icon: ClipboardCheck, label: "Planificá" },
  { href: "/balance", icon: Receipt, label: "Registrá" },
  { href: "/compras", icon: ShoppingCart, label: "Ahorrá" },
  { href: "/descubrir", icon: Compass, label: "Descubrí" },
  { href: "/cocina", icon: ChefHat, label: "Cociná" },
];

export function AppNavMobile() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] z-50 md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around rounded-2xl bg-white px-2 py-1.5 shadow-lg">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-all duration-200 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn(
                "text-[10px] leading-tight",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
