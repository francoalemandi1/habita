import type { LucideIcon } from "lucide-react-native";

// ─── Hero Card ──────────────────────────────────────────────────────────────

export type HeroPriority =
  | "today"
  | "transfers"
  | "balance-owed"
  | "balance-owing"
  | "all-clear";

export interface HeroState {
  priority: HeroPriority;
  /** Motivational headline (Caveat font) */
  headline: string;
  /** Contextual description */
  label: string;
  /** CTA button text */
  ctaLabel: string;
  /** Route to navigate to */
  ctaRoute: string;
}

// ─── Quick Stats ────────────────────────────────────────────────────────────

export interface QuickStatItem {
  id: string;
  label: string;
  route: string;
  variant: "default" | "success" | "error";
}

// ─── Daily Highlight ────────────────────────────────────────────────────────

export type HighlightType = "deal" | "event" | "recipe";

export interface DailyHighlightState {
  type: HighlightType;
  title: string;
  subtitle: string;
  categoryLabel: string;
  ctaLabel: string;
  ctaRoute: string;
  ctaParams?: Record<string, string>;
}
