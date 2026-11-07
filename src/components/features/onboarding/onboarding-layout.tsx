"use client";

import { ArrowLeft } from "lucide-react";
import { Button, ProgressBar } from "@/components/ds";
import { HabitaLogo } from "@/components/ui/habita-logo";

import type { ReactNode } from "react";

interface OnboardingLayoutProps {
  children: ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  showContinue?: boolean;
  /** 2-step progress bar, per handoff §5.3 Crear hogar. */
  step?: { current: number; total: number };
}

/** Shared chrome for Crear hogar / Invitar / Unirse — ds primitives only. */
export function OnboardingLayout({
  children,
  onBack,
  onContinue,
  continueLabel = "Seguir",
  continueDisabled = false,
  continueLoading = false,
  showContinue = true,
  step,
}: OnboardingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex size-9 items-center justify-center rounded-full"
              aria-label="Volver"
            >
              <ArrowLeft className="size-5 text-ink" strokeWidth={1.75} />
            </button>
          ) : (
            <div className="size-9" />
          )}
          <HabitaLogo size={24} />
          <div className="size-9" />
        </div>
        {step && <ProgressBar value={step.current} max={step.total} />}
      </header>

      <main className="flex-1 px-4 py-8 md:mx-auto md:w-full md:max-w-lg">{children}</main>

      {showContinue && onContinue && (
        <div className="sticky bottom-0 bg-paper p-4 pb-6 md:mx-auto md:w-full md:max-w-lg">
          <Button
            type="button"
            className="w-full"
            onClick={onContinue}
            disabled={continueDisabled}
            loading={continueLoading}
            loadingLabel="Creando"
          >
            {continueLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
