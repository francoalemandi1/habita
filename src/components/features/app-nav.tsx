"use client";

import Link from "next/link";
import {
  Home,
  ListTodo,
  ClipboardList,
  Gift,
  User,
  Settings,
  RefreshCw,
  Shield,
  Gamepad2,
  Trophy,
} from "lucide-react";
import { NotificationsDropdown } from "@/components/features/notifications-dropdown";

import type { MemberType } from "@prisma/client";

interface AppNavProps {
  memberType: MemberType;
}

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "Inicio", roles: ["ADULT", "TEEN"] },
  { href: "/kids", icon: Gamepad2, label: "Mis tareas", roles: ["CHILD"] },
  { href: "/my-tasks", icon: ListTodo, label: "Mis tareas", roles: ["ADULT", "TEEN"] },
  { href: "/tasks", icon: ClipboardList, label: "Gestión", roles: ["ADULT"] },
  { href: "/competitions", icon: Trophy, label: "Competir", roles: ["ADULT", "TEEN", "CHILD"] },
  { href: "/rewards", icon: Gift, label: "Recompensas", roles: ["ADULT", "TEEN", "CHILD"] },
  // { href: "/rotations", icon: RefreshCw, label: "Rotaciones", roles: ["ADULT"] },
  // { href: "/parental", icon: Shield, label: "Control parental", roles: ["ADULT"] },
  { href: "/preferences", icon: Settings, label: "Preferencias", roles: ["ADULT", "TEEN"] },
  { href: "/profile", icon: User, label: "Perfil", roles: ["ADULT", "TEEN", "CHILD"] },
];

export function AppNav({ memberType }: AppNavProps) {
  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(memberType)
  );

  return (
    <nav className="flex items-center gap-2 sm:gap-4">
      <div className="hidden md:flex md:items-center md:gap-2 md:gap-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
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
