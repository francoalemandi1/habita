"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import type { ReactNode } from "react";

interface Step {
  icon: ReactNode;
  title: string;
  description: string;
}

interface SectionGuideCardProps {
  steps: Step[];
  onDismiss: () => void;
}

export function SectionGuideCard({ steps, onDismiss }: SectionGuideCardProps) {
  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 border-primary/20 duration-300">
      <CardContent className="py-5">
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.title} className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-muted-foreground">{step.icon}</span>
                  <p className="text-sm font-semibold">{step.title}</p>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Entendido
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
