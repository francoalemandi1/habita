"use client";

import { SectionGuideCard } from "@/components/features/section-guide-card";
import { useFirstVisit } from "@/hooks/use-first-visit";
import { ShoppingCart, ClipboardList, Sparkles } from "lucide-react";

export function DashboardWelcomeCard() {
  const { isFirstVisit, dismiss } = useFirstVisit("dashboard");

  if (!isFirstVisit) return null;

  return (
    <SectionGuideCard
      steps={[
        {
          icon: <ShoppingCart className="h-4 w-4" />,
          title: "Ahorrá en compras",
          description: "Compará precios en 11 supermercados y encontrá las mejores ofertas",
        },
        {
          icon: <ClipboardList className="h-4 w-4" />,
          title: "Organizá tu hogar",
          description: "Creá tareas, generá un plan semanal y ganá XP completándolas",
        },
        {
          icon: <Sparkles className="h-4 w-4" />,
          title: "Descubrí tu ciudad",
          description: "Eventos, recetas y actividades cerca tuyo",
        },
      ]}
      onDismiss={dismiss}
    />
  );
}
