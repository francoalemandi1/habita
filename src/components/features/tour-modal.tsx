"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Users, Receipt, ShoppingCart, MapPin, ChefHat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { TourSection } from "@/hooks/use-guided-tour";

interface TourModalProps {
  section: TourSection;
  stepNumber: number;
  totalSteps: number;
  open: boolean;
  onDismiss: () => void;
  onSkipTour: () => void;
  onNavigate: () => void;
}

interface TourSectionContent {
  icon: typeof Users;
  title: string;
  description: string;
  features: { emoji: string; label: string }[];
  cta: string;
  route: string;
}

const TOUR_CONTENT: Record<TourSection, TourSectionContent> = {
  invitar: {
    icon: Users,
    title: "Invitá a tu hogar",
    description: "Habita funciona mejor en equipo. Invitá a las personas con las que vivís.",
    features: [
      { emoji: "👥", label: "Dividir gastos" },
      { emoji: "📊", label: "Ver quién hace qué" },
      { emoji: "🔔", label: "Notificarse mutuamente" },
    ],
    cta: "Compartir invitación",
    route: "/settings",
  },
  registra: {
    icon: Receipt,
    title: "Registrá gastos",
    description: "Anotá cuánto gastan y Habita calcula los balances automáticamente.",
    features: [
      { emoji: "🧾", label: "Registro rápido" },
      { emoji: "📈", label: "Insights automáticos" },
      { emoji: "💰", label: "Liquidar deudas" },
    ],
    cta: "Registrar un gasto",
    route: "/expenses",
  },
  ahorra: {
    icon: ShoppingCart,
    title: "Compará precios",
    description: "Buscá productos y encontrá el mejor precio en 11 supermercados.",
    features: [
      { emoji: "🔍", label: "Buscar productos" },
      { emoji: "🏪", label: "11 supermercados" },
      { emoji: "🏷️", label: "Ofertas bancarias" },
    ],
    cta: "Buscar un producto",
    route: "/shopping",
  },
  descubri: {
    icon: MapPin,
    title: "Descubrí tu ciudad",
    description: "Cine, teatro, música y más — todo lo que pasa cerca tuyo.",
    features: [
      { emoji: "🎫", label: "Eventos actualizados" },
      { emoji: "🔖", label: "Guardá favoritos" },
      { emoji: "📍", label: "Filtrar por zona" },
    ],
    cta: "Explorar eventos",
    route: "/discover",
  },
  cocina: {
    icon: ChefHat,
    title: "Cociná con lo que tenés",
    description: "Decile a Habita qué tenés y te sugiere recetas personalizadas.",
    features: [
      { emoji: "👨‍🍳", label: "Recetas personalizadas" },
      { emoji: "⏱️", label: "Filtrar por tiempo" },
      { emoji: "❤️", label: "Guardar favoritas" },
    ],
    cta: "Probar Cociná",
    route: "/cocina",
  },
};

export function TourModal({
  section,
  stepNumber,
  totalSteps,
  open,
  onDismiss,
  onSkipTour,
  onNavigate,
}: TourModalProps) {
  const router = useRouter();
  const content = TOUR_CONTENT[section];
  const Icon = content.icon;

  const handleCta = useCallback(() => {
    onNavigate();
    router.push(content.route);
  }, [onNavigate, router, content.route]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onDismiss(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center">
          {/* Step dots */}
          <div className="mb-3 flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i + 1 === stepNumber
                    ? "w-6 bg-primary"
                    : i + 1 < stepNumber
                      ? "w-1.5 bg-primary/40"
                      : "w-1.5 bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Icon className="h-7 w-7 text-primary" />
          </div>

          <DialogTitle className="text-xl">{content.title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        {/* Feature list */}
        <div className="space-y-2 py-2">
          {content.features.map((f) => (
            <div key={f.label} className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-2.5">
              <span className="text-lg">{f.emoji}</span>
              <span className="text-sm font-medium">{f.label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleCta}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {content.cta}
        </button>

        {/* Dismiss / Skip */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onDismiss}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Ahora no
          </button>
          {stepNumber === 1 && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <button
                onClick={onSkipTour}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Saltar tour
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
