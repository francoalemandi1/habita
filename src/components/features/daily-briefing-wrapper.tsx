"use client";

import { useState, useEffect } from "react";
import { DailyBriefing } from "./daily-briefing";

interface BriefingData {
  greeting: string;
  line1: string;
  line2: string;
  line3: string;
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
      line1={briefing.line1}
      line2={briefing.line2}
      line3={briefing.line3}
    />
  );
}
