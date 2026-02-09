"use client";

import Link from "next/link";
import { Home, ListTodo, CalendarDays, Gift, User } from "lucide-react";
import { NotificationsDropdown } from "@/components/features/notifications-dropdown";

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "Hogar" },
  { href: "/my-tasks", icon: ListTodo, label: "Tareas" },
  { href: "/plans", icon: CalendarDays, label: "Planes" },
  { href: "/rewards", icon: Gift, label: "Recompensas" },
  { href: "/profile", icon: User, label: "Perfil" },
];

export function AppNav() {
  return (
    <nav className="flex items-center gap-2 sm:gap-4">
      <div className="hidden md:flex md:items-center md:gap-2 md:gap-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/60 hover:text-foreground"
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
