"use client";

import { CheckCircle2, ListTodo, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DailyBriefingProps {
  greeting: string;
  line1: string;
  line2: string;
  line3: string;
}

const LINES_CONFIG = [
  { icon: CheckCircle2, color: "text-green-600" },
  { icon: ListTodo, color: "text-blue-600" },
  { icon: Lightbulb, color: "text-amber-500" },
] as const;

export function DailyBriefing({
  greeting,
  line1,
  line2,
  line3,
}: DailyBriefingProps) {
  const lines = [line1, line2, line3];

  return (
    <Card>
      <CardContent className="py-4">
        <p className="mb-3 text-sm font-semibold">{greeting}</p>
        <div className="space-y-2">
          {lines.map((line, index) => {
            const config = LINES_CONFIG[index]!;
            const Icon = config.icon;
            return (
              <div key={index} className="flex items-start gap-3">
                <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${config.color}`} />
                <p className="text-sm leading-relaxed text-muted-foreground">{line}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
