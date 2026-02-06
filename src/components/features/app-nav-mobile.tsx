"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListTodo, Gift, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/my-tasks", icon: ListTodo, label: "Tareas" },
  { href: "/dashboard", icon: Home, label: "Hogar" },
  { href: "/rewards", icon: Gift, label: "Recompensas" },
  { href: "/profile", icon: User, label: "Perfil" },
];

export function AppNavMobile() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-card/95 backdrop-blur-md md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 min-w-[56px] transition-colors touch-manipulation",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={2.5} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
