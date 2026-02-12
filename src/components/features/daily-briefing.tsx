"use client";

import { Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { spacing, iconSize } from "@/lib/design-tokens";

interface DailyBriefingProps {
  greeting: string;
  summary: string;
  highlights: string[];
  suggestion: string;
}

export function DailyBriefing({
  greeting,
  summary,
  highlights,
  suggestion,
}: DailyBriefingProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 sm:pt-6 sm:pb-6">
        {/* Greeting + Summary */}
        <p className="text-sm font-semibold">{greeting}</p>
        <p className="mt-1 text-sm text-muted-foreground">{summary}</p>

        {/* Highlights */}
        {highlights.length > 0 && (
          <ul className={`mt-3 ${spacing.contentStackTight}`}>
            {highlights.map((highlight, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
                <span className="text-muted-foreground">{highlight}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Suggestion */}
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950">
          <Lightbulb className={`${iconSize.sm} mt-0.5 shrink-0 text-amber-500`} />
          <p className="text-sm text-amber-800 dark:text-amber-200">{suggestion}</p>
        </div>
      </CardContent>
    </Card>
  );
}
