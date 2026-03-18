import Link from "next/link";
import { ShoppingCart, ChefHat, Compass, ChevronRight } from "lucide-react";
import { detectTaskType } from "@/lib/task-type-detection";

import type { LucideIcon } from "lucide-react";

interface BridgeConfig {
  icon: LucideIcon;
  message: string;
  href: string;
  bgClass: string;
  iconClass: string;
}

interface ContextualBridgesProps {
  /** Today's pending task names for the current member */
  pendingTaskNames: string[];
  /** Whether all of today's tasks are done */
  allTasksDone: boolean;
  /** Whether the household has location set (for Descubrí) */
  hasLocation: boolean;
}

export function ContextualBridges({ pendingTaskNames, allTasksDone, hasLocation }: ContextualBridgesProps) {
  const bridges: BridgeConfig[] = [];

  // Bridge: shopping task pending → Ahorrá
  if (pendingTaskNames.some((name) => detectTaskType(name) === "shopping")) {
    bridges.push({
      icon: ShoppingCart,
      message: "Compará precios antes de ir al super",
      href: "/compras",
      bgClass: "bg-green-50 dark:bg-green-950/30",
      iconClass: "text-green-600 dark:text-green-400",
    });
  }

  // Bridge: cooking task pending → Cociná
  if (pendingTaskNames.some((name) => detectTaskType(name) === "cooking")) {
    bridges.push({
      icon: ChefHat,
      message: "Buscá recetas para lo que vas a cocinar",
      href: "/cocina",
      bgClass: "bg-orange-50 dark:bg-orange-950/30",
      iconClass: "text-orange-600 dark:text-orange-400",
    });
  }

  // Bridge: all done + location → Descubrí
  if (allTasksDone && hasLocation) {
    bridges.push({
      icon: Compass,
      message: "¡Todo listo! Descubrí qué hacer hoy",
      href: "/descubrir",
      bgClass: "bg-purple-50 dark:bg-purple-950/30",
      iconClass: "text-purple-600 dark:text-purple-400",
    });
  }

  if (bridges.length === 0) return null;

  return (
    <div className="space-y-2">
      {bridges.map((bridge) => {
        const Icon = bridge.icon;
        return (
          <Link
            key={bridge.href}
            href={bridge.href}
            className={`group flex items-center gap-3 rounded-xl px-4 py-3 transition-all hover:shadow-sm active:scale-[0.99] ${bridge.bgClass}`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${bridge.iconClass}`} />
            <span className="flex-1 text-sm font-medium text-foreground">
              {bridge.message}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        );
      })}
    </div>
  );
}
