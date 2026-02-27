"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, Receipt, ShoppingCart, Compass, ChefHat } from "lucide-react";
import { NotificationsDropdown } from "@/components/features/notifications-dropdown";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/my-tasks", icon: ClipboardCheck, label: "Planificá" },
  { href: "/balance", icon: Receipt, label: "Registrá" },
  { href: "/compras", icon: ShoppingCart, label: "Ahorrá" },
  { href: "/descubrir", icon: Compass, label: "Descubrí" },
  { href: "/cocina", icon: ChefHat, label: "Cociná" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2 sm:gap-4">
      <div className="hidden md:flex md:items-center md:gap-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:bg-muted/60 hover:text-foreground",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
      <NotificationsDropdown />
    </nav>
  );
}
