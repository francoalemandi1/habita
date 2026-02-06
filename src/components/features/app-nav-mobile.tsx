"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ListTodo, Gift, User, Menu, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { MemberType } from "@prisma/client";

interface HouseholdOption {
  id: string;
  name: string;
}

const MAIN_NAV_ADULT_TEEN = [
  { href: "/dashboard", icon: Home, label: "Inicio" },
  { href: "/my-tasks", icon: ListTodo, label: "Mis tareas" },
  { href: "/rewards", icon: Gift, label: "Recompensas" },
  { href: "/profile", icon: User, label: "Perfil" },
];

const MAIN_NAV_CHILD = [
  { href: "/kids", icon: Home, label: "Inicio" },
  { href: "/kids", icon: ListTodo, label: "Tareas" },
  { href: "/rewards", icon: Gift, label: "Recompensas" },
  { href: "/profile", icon: User, label: "Perfil" },
];

const EXTRA_LINKS = [
  { href: "/tasks", label: "Gestión" },
  // { href: "/rotations", label: "Rotaciones" },
  // { href: "/parental", label: "Control parental" },
  { href: "/preferences", label: "Preferencias" },
];

interface AppNavMobileProps {
  memberType: MemberType;
  households: HouseholdOption[];
  currentHouseholdId: string;
}

export function AppNavMobile({ memberType, households, currentHouseholdId }: AppNavMobileProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const mainNav = memberType === "CHILD" ? MAIN_NAV_CHILD : MAIN_NAV_ADULT_TEEN;

  const handleHouseholdChange = async (householdId: string) => {
    if (householdId === currentHouseholdId) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/households/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSwitching(false);
    }
  };

  const showExtra = (href: string) => {
    if (href === "/parental" && memberType !== "ADULT") return false;
    if (href === "/preferences" && memberType === "CHILD") return false;
    if ((href === "/tasks" || href === "/rotations") && memberType !== "ADULT") return false;
    return true;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-card/95 backdrop-blur-md pb-safe md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {mainNav.map((item) => {
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 min-w-[56px] transition-colors touch-manipulation",
                pathname !== "/dashboard" && pathname !== "/my-tasks" && pathname !== "/rewards" && pathname !== "/profile"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Menu className="h-6 w-6" />
              <span className="text-[10px] font-semibold">Más</span>
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl border-2 sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>Más opciones</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-1">
              {households.length > 1 && (
                <div className="border-b border-border pb-3 mb-2">
                  <p className="px-4 text-xs font-medium text-muted-foreground mb-2">Cambiar hogar</p>
                  <div className="flex flex-col gap-1">
                    {households.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => handleHouseholdChange(h.id)}
                        disabled={switching}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-4 py-3 text-left font-medium hover:bg-muted disabled:opacity-50",
                          h.id === currentHouseholdId && "bg-primary/10 text-primary"
                        )}
                      >
                        {switching && h.id !== currentHouseholdId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Home className="h-4 w-4" />
                        )}
                        {h.name}
                        {h.id === currentHouseholdId && (
                          <span className="ml-auto text-xs text-muted-foreground">Actual</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {EXTRA_LINKS.filter((l) => showExtra(l.href)).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-left font-medium hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </nav>
  );
}
