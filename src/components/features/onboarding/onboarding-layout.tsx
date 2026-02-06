"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

import type { ReactNode } from "react";

interface OnboardingLayoutProps {
  children: ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  showContinue?: boolean;
}

export function OnboardingLayout({
  children,
  onBack,
  onContinue,
  continueLabel = "Continuar",
  continueDisabled = false,
  continueLoading = false,
  showContinue = true,
}: OnboardingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
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
        <span className="text-base font-normal text-foreground">Habita</span>
        <div className="size-9" />
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8">
        {children}
      </main>

      {/* Sticky bottom button */}
      {showContinue && onContinue && (
        <div className="sticky bottom-0 bg-background p-4 pb-6">
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={onContinue}
            disabled={continueDisabled || continueLoading}
          >
            {continueLoading ? "Cargando..." : continueLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
