"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, Home, Gift, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/my-tasks", icon: ClipboardCheck, label: "Tareas" },
  { href: "/dashboard", icon: Home, label: "Hogar" },
  { href: "/rewards", icon: Gift, label: "Recompensas" },
  { href: "/profile", icon: User, label: "Perfil" },
];

export function AppNavMobile() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around rounded-full bg-white px-4 shadow-lg">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-center rounded-full p-3 transition-colors touch-manipulation",
                isActive
                  ? "bg-[#ffe8c3] text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-6" strokeWidth={isActive ? 2.5 : 2} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
