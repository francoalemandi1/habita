"use client";

import { useState, useEffect } from "react";
import { DailyBriefing } from "./daily-briefing";

interface BriefingData {
  greeting: string;
  summary: string;
  highlights: string[];
  suggestion: string;
}

export function DailyBriefingWrapper() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        const response = await fetch("/api/briefing");
        if (!response.ok) return;
        const data = (await response.json()) as BriefingData;
        setBriefing(data);
      } catch {
        // Silently skip on error
      }
    };

    fetchBriefing();
  }, []);

  if (!briefing) return null;

  return (
    <DailyBriefing
      greeting={briefing.greeting}
      summary={briefing.summary}
      highlights={briefing.highlights}
      suggestion={briefing.suggestion}
    />
  );
}
