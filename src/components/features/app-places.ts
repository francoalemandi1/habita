import { Home, ListChecks, ShoppingBasket, Wallet } from "lucide-react";
import { APP_ROUTES } from "@habita/contracts";

import type { SidebarItem } from "@/components/ds/sidebar";

/** The four places (handoff §5.1); same order and icons in the sidebar and the mobile tab bar. */
export const APP_PLACES: SidebarItem[] = [
  { id: "casa", label: "Casa", icon: Home, href: APP_ROUTES.casa },
  { id: "tareas", label: "Tareas", icon: ListChecks, href: APP_ROUTES.tareas },
  { id: "plata", label: "Plata", icon: Wallet, href: APP_ROUTES.plata },
  { id: "super", label: "Súper", icon: ShoppingBasket, href: APP_ROUTES.super },
];

/** Active place id for a pathname; null on screens outside the four places (Perfil, Avisos). */
export function resolveActivePlace(pathname: string): string | null {
  return APP_PLACES.find((place) => pathname === place.href || pathname.startsWith(`${place.href}/`))?.id ?? null;
}
