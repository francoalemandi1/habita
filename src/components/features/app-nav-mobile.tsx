"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardCheck,
  Receipt,
  ShoppingCart,
  MoreHorizontal,
  Compass,
  ChefHat,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAIN_ITEMS = [
  { href: "/dashboard", icon: Home, label: "Habita" },
  { href: "/my-tasks", icon: ClipboardCheck, label: "Organizá" },
  { href: "/balance", icon: Receipt, label: "Controlá" },
  { href: "/compras", icon: ShoppingCart, label: "Ahorrá" },
];

const MORE_ITEMS = [
  { href: "/descubrir", icon: Compass, label: "Descubrí" },
  { href: "/cocina", icon: ChefHat, label: "Cociná" },
];

export function AppNavMobile() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close "Más" popover on outside click
  useEffect(() => {
    if (!moreOpen) return;
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [moreOpen]);

  // Close on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const isMoreActive = MORE_ITEMS.some((item) => pathname.startsWith(item.href));

  return (
    <nav className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] z-50 md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around rounded-2xl bg-card px-2 py-1.5 shadow-lg">
        {MAIN_ITEMS.map((item) => {
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

        {/* "Más" button with popover */}
        <div ref={moreRef} className="relative">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-all duration-200 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isMoreActive || moreOpen
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={isMoreActive ? 2.5 : 2} />
            <span className={cn(
              "text-[10px] leading-tight",
              isMoreActive ? "font-semibold" : "font-medium"
            )}>
              Más
            </span>
          </button>

          {moreOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-40 rounded-xl bg-card p-1.5 shadow-xl border animate-in fade-in slide-in-from-bottom-2 duration-150">
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
