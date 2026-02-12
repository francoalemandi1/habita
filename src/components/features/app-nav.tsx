"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListTodo, CalendarDays, Sparkles, ChefHat, User } from "lucide-react";
import { NotificationsDropdown } from "@/components/features/notifications-dropdown";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "Hogar" },
  { href: "/my-tasks", icon: ListTodo, label: "Tareas" },
  // { href: "/plans", icon: CalendarDays, label: "Planes" }, // Accesible desde dashboard → "Ver planes"
  // { href: "/rewards", icon: Gift, label: "Recompensas" }, // Hidden for MVP
  { href: "/relax", icon: Sparkles, label: "Relaja" },
  { href: "/cocina", icon: ChefHat, label: "Cocina" },
  { href: "/profile", icon: User, label: "Perfil" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2 sm:gap-4">
      <div className="hidden md:flex md:items-center md:gap-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
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
