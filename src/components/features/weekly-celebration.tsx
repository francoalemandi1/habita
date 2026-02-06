"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

interface WeeklyCelebrationProps {
  weeklyCompleted: number;
  totalCompleted: number;
  onDismiss: () => void;
}

export function WeeklyCelebration({
  weeklyCompleted,
  totalCompleted,
  onDismiss,
}: WeeklyCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-primary/5">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="pointer-events-none absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`,
              }}
            >
              {["🎉", "✨", "🌟", "💫", "🎊"][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="absolute right-2 top-2 h-8 w-8 p-0"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardContent className="py-8 text-center">
        <div className="mb-4 text-6xl">🎉</div>
        <h2 className="mb-2 text-2xl font-bold">
          ¡Completaste todas tus tareas!
        </h2>
        <p className="mb-6 text-muted-foreground">
          ¡Felicitaciones! Has terminado con todas tus responsabilidades de la semana.
        </p>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-3xl font-bold text-primary">{weeklyCompleted}</p>
            <p className="text-sm text-muted-foreground">tareas esta semana</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-3xl font-bold text-primary">{totalCompleted}</p>
            <p className="text-sm text-muted-foreground">tareas en total</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          ¡Disfruta tu tiempo libre! 🌴
        </p>
      </CardContent>
    </Card>
  );
}
