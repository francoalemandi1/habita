"use client";

import { useState, useEffect } from "react";
import { DailyBriefing } from "./daily-briefing";
import { apiFetch } from "@/lib/api-client";

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
        const data = await apiFetch<BriefingData>("/api/briefing");
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
