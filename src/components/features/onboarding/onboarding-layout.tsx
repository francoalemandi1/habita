"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "@/components/features/onboarding/progress-indicator";
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
  progress?: { steps: string[]; currentStep: string };
}

export function OnboardingLayout({
  children,
  onBack,
  onContinue,
  continueLabel = "Continuar",
  continueDisabled = false,
  continueLoading = false,
  showContinue = true,
  progress,
}: OnboardingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex size-9 items-center justify-center rounded-full"
              aria-label="Volver"
            >
              <ArrowLeft className="size-5 text-foreground" />
            </button>
          ) : (
            <div className="size-9" />
          )}
          <HabitaLogo size={24} />
          <div className="size-9" />
        </div>
        {progress && (
          <ProgressIndicator steps={progress.steps} currentStep={progress.currentStep} />
        )}
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8 md:mx-auto md:w-full md:max-w-lg">
        {children}
      </main>

      {/* Sticky bottom button */}
      {showContinue && onContinue && (
        <div className="sticky bottom-0 bg-background p-4 pb-6 md:mx-auto md:w-full md:max-w-lg">
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={onContinue}
            disabled={continueDisabled || continueLoading}
          >
            {continueLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Cargando...
              </>
            ) : (
              continueLabel
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
