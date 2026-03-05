"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface OnboardingChecklistProps {
  hasExpense: boolean;
  hasCompletedTask: boolean;
}

const DISMISSED_KEY = "habita:onboarding-checklist:dismissed";
const SHOPPING_KEY = "habita:shopping-first-search";

function readLocalStorage(key: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(key) === "1";
}

export function OnboardingChecklist({ hasExpense, hasCompletedTask }: OnboardingChecklistProps) {
  // Always start hidden to match server render — hydrate from localStorage in useEffect
  const [dismissed, setDismissed] = useState(true);
  const [shoppingSearched, setShoppingSearched] = useState(false);
  const autoCompleteFired = useRef(false);

  // Hydrate client-only state after mount (avoids SSR/client mismatch)
  useEffect(() => {
    setDismissed(readLocalStorage(DISMISSED_KEY));
    setShoppingSearched(readLocalStorage(SHOPPING_KEY));
  // eslint-disable-next-line react-hooks/set-state-in-effect
  }, []); // intentional: runs once on mount to hydrate from localStorage

  // Re-sync shopping key while mounted (e.g. user navigates to Ahorrá and comes back)
  useEffect(() => {
    const interval = setInterval(() => {
      setShoppingSearched(readLocalStorage(SHOPPING_KEY));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    {
      label: "Registrá tu primer gasto",
      href: "/balance",
      done: hasExpense,
    },
    {
      label: "Creá o completá una tarea",
      href: "/my-tasks",
      done: hasCompletedTask,
    },
    {
      label: "Compará precios en el super",
      href: "/compras",
      done: shoppingSearched,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === 3;
  const completing = allDone && !dismissed;

  useEffect(() => {
    if (!allDone || dismissed || autoCompleteFired.current) return;

    autoCompleteFired.current = true;
    const timer = setTimeout(() => {
      localStorage.setItem(DISMISSED_KEY, "1");
      setDismissed(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [allDone, dismissed]);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 border-primary/20 duration-300">
      <CardContent className="py-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Tus primeros pasos</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedCount} de 3 completados
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(completedCount / 3) * 100}%` }}
          />
        </div>

        {/* Completion state */}
        {completing ? (
          <p className="py-2 text-center text-sm font-medium text-primary">
            ¡Completaste todos los pasos! 🎉
          </p>
        ) : (
          <div className="space-y-3">
            {steps.map((step) => (
              <Link
                key={step.label}
                href={step.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  step.done
                    ? "text-muted-foreground"
                    : "hover:bg-muted/60"
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground/50" />
                )}
                <span
                  className={`text-sm font-medium ${
                    step.done ? "line-through" : ""
                  }`}
                >
                  {step.label}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
