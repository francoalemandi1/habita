/**
 * Habita Design System Tokens (web mirror) — Rebrand (Fase 1, §9)
 *
 * Deprecated exports below are kept so unmigrated pages keep compiling; they
 * resolve to the new §9 tokens re-exported from `@habita/design-tokens`.
 */
import { colors as newColors } from "@habita/design-tokens";

export {
  colors as newColors,
  darkColors as newDarkColors,
  shadowTokens,
  typeScale,
  motion,
  radii,
  spacing as newSpacing,
} from "@habita/design-tokens";

// ============================================
// 1. COLOR PALETTE (raw hex values)
// ============================================

/**
 * @deprecated Use `newColors` / `newDarkColors` instead. Remapped to the §9
 * neutral palette: lime/tan/cream→sand, lavender/lavenderLight→monteSoft,
 * purpleDark/foregroundDark→ink, orange→ladrillo, peach→ladrilloSoft.
 */
export const palette = {
  primary: newColors.monte,
  primaryLight: newColors.monteSoft,
  lime: newColors.mantecaSoft,
  successDark: newColors.monte,
  lavender: newColors.monteSoft,
  lavenderLight: newColors.monteSoft,
  purpleDark: newColors.ink,
  foregroundDark: newColors.ink,
  tan: newColors.sand,
  cream: newColors.sand,
  background: newColors.paper,
  orange: newColors.ladrillo,
  peach: newColors.ladrilloSoft,
  white: newColors.paper,
} as const;

// ============================================
// 2. CYCLING COLORS (member/segment assignment)
// ============================================

/** @deprecated Avatars are now an initial over `line` (§9) — kept as a flat neutral cycle. */
export const cyclingColors = [
  newColors.line,
  newColors.sand,
  newColors.monteSoft,
  newColors.mantecaSoft,
  newColors.line,
  newColors.sand,
  newColors.monteSoft,
  newColors.mantecaSoft,
] as const;

/** @deprecated Text color paired with each `cyclingColors` entry. */
export const cyclingTextColors = [
  newColors.ink,
  newColors.ink,
  newColors.ink,
  newColors.ink,
  newColors.ink,
  newColors.ink,
  newColors.ink,
  newColors.ink,
] as const;

// ============================================
// 2b. WHEEL COLORS (richer palette for roulette)
// ============================================

/** @deprecated Neutral replacement — the roulette result no longer uses per-segment brand hues. */
export const wheelColors = [
  newColors.monte,
  newColors.ladrillo,
  newColors.ink,
  newColors.monteSoft,
  newColors.sand,
  newColors.manteca,
  newColors.monte,
  newColors.ladrilloSoft,
  newColors.monteSoft,
  newColors.mantecaSoft,
  newColors.sand,
  newColors.ladrillo,
] as const;

/** @deprecated Text colors for each `wheelColors` entry. */
export const wheelTextColors: readonly string[] = [
  newColors.paper,
  newColors.paper,
  newColors.paper,
  newColors.ink,
  newColors.ink,
  newColors.mantecaText,
  newColors.paper,
  newColors.ladrilloText,
  newColors.ink,
  newColors.ink,
  newColors.ink,
  newColors.paper,
];

// ============================================
// 3. CONTRAST HELPERS
// ============================================

const LIGHT_BACKGROUNDS = new Set<string>([
  palette.lime,
  palette.lavender,
  palette.tan,
  palette.cream,
  palette.lavenderLight,
  palette.peach,
]);

/** Returns the appropriate foreground hex for a given background hex. */
export function contrastText(backgroundHex: string): string {
  return LIGHT_BACKGROUNDS.has(backgroundHex)
    ? palette.foregroundDark
    : palette.white;
}

// ============================================
// 4. SEMANTIC CARD COLOR SETS (Tailwind classes)
// ============================================

/** @deprecated Neutral replacement — no more per-slot brand-colored assignment cards. */
export const assignmentCardColors = [
  {
    bg: "bg-[--color-monte-soft]",
    text: "text-[--color-ink]",
    meta: "text-[--color-ink-2]",
    btnBg: "bg-[--color-sand] hover:bg-[--color-line] text-[--color-ink]",
  },
  {
    bg: "bg-[--color-sand]",
    text: "text-[--color-ink]",
    meta: "text-[--color-ink-2]",
    btnBg: "bg-[--color-line] hover:bg-[--color-line-soft] text-[--color-ink]",
  },
  {
    bg: "bg-[--color-manteca-soft]",
    text: "text-[--color-ink]",
    meta: "text-[--color-ink-2]",
    btnBg: "bg-[--color-sand] hover:bg-[--color-line] text-[--color-ink]",
  },
] as const;

// ── 4b. STORE BRAND COLORS (supermarket comparison) — UNCHANGED (third-party) ──

/** Store brand colors — letter avatars for the supermarket comparison feature. */
export const storeColors: Record<string, { bg: string; text: string }> = {
  "Carrefour":     { bg: "#003da5", text: "#ffffff" },
  "Coto":          { bg: "#e31837", text: "#ffffff" },
  "Dia":           { bg: "#d52b1e", text: "#ffffff" },
  "Disco":         { bg: "#0066b2", text: "#ffffff" },
  "Jumbo":         { bg: "#009b3a", text: "#ffffff" },
  "Mas Online":    { bg: "#522a97", text: "#ffffff" },
  "Vea":           { bg: "#fd7c52", text: "#ffffff" },
  "HiperLibertad": { bg: "#e31837", text: "#ffffff" },
  "Cordiez":       { bg: "#7aa649", text: "#ffffff" },
  "Toledo":        { bg: "#4080d0", text: "#ffffff" },
  "Coop. Obrera":  { bg: "#5260fe", text: "#ffffff" },
};

export const storeColorFallback = { bg: "#595959", text: "#ffffff" } as const;

/** Store name → website domain for favicon fetching. */
export const storeDomains: Record<string, string> = {
  "Carrefour":     "www.carrefour.com.ar",
  "Coto":          "www.cotodigital.com.ar",
  "Dia":           "diaonline.supermercadosdia.com.ar",
  "Disco":         "www.disco.com.ar",
  "Jumbo":         "www.jumbo.com.ar",
  "Mas Online":    "www.masonline.com.ar",
  "Vea":           "www.vea.com.ar",
  "HiperLibertad": "www.hiperlibertad.com.ar",
  "Cordiez":       "www.cordiez.com.ar",
  "Toledo":        "www.toledodigital.com.ar",
  "Coop. Obrera":  "www.lacoopeencasa.coop",
};

/** Get Google Favicon URL for a store. Returns null if the store domain is unknown. */
export function getStoreFaviconUrl(storeName: string, size: number = 64): string | null {
  const domain = storeDomains[storeName];
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

/** @deprecated Neutral replacement — notification cards no longer carry per-type brand color. */
export const notificationStyles: Record<
  string,
  { bg: string; iconColor: string }
> = {
  TRANSFER_REQUEST: { bg: "bg-[--color-sand]/50", iconColor: "text-primary" },
  TRANSFER_ACCEPTED: { bg: "bg-[--color-monte-soft]/40", iconColor: "text-primary" },
  TRANSFER_REJECTED: { bg: "bg-[--color-ladrillo-soft]", iconColor: "text-destructive" },
  TASK_OVERDUE: { bg: "bg-[--color-manteca-soft]", iconColor: "text-destructive" },
  REMINDER_DUE: { bg: "bg-[--color-sand]", iconColor: "text-[--color-ink-2]" },
  PLAN_READY: { bg: "bg-[--color-sand]/50", iconColor: "text-primary" },
  PLAN_APPLIED: { bg: "bg-[--color-monte-soft]/40", iconColor: "text-primary" },
  SERVICE_DUE_SOON: { bg: "bg-[--color-manteca-soft]", iconColor: "text-[--color-manteca-text]" },
  EXPENSE_WEEKLY_SUMMARY: { bg: "bg-[--color-sand]", iconColor: "text-[--color-ink-2]" },
  TASK_REMINDER: { bg: "bg-[--color-sand]", iconColor: "text-[--color-ink-2]" },
};

export const notificationStyleDefault = {
  bg: "bg-muted/50",
  iconColor: "text-muted-foreground",
} as const;

/** @deprecated Neutral replacement — stat cards no longer carry per-variant brand color. */
export const statCardColors = {
  purple: { bg: "bg-[--color-monte-soft]", text: "text-[--color-ink]" },
  lime: { bg: "bg-[--color-manteca-soft]", text: "text-[--color-ink]" },
  tan: { bg: "bg-[--color-sand]", text: "text-[--color-ink]" },
  cream: { bg: "bg-[--color-sand]", text: "text-[--color-ink]" },
  primary: { bg: "bg-[--color-monte]", text: "text-[--color-paper]" },
  orange: { bg: "bg-[--color-ladrillo-soft]", text: "text-[--color-ladrillo-text]" },
  lavenderLight: { bg: "bg-[--color-monte-soft]", text: "text-[--color-ink]" },
} as const;

// ============================================
// 5. SHADOWS
// ============================================

/** Semantic shadow scale (Tailwind utility classes). */
export const shadows = {
  /** Default card surface */
  card: "shadow-sm",
  /** Hovered card / secondary elevation */
  cardHover: "shadow-md",
  /** Modals, auth cards, popovers */
  elevated: "shadow-lg",
  /** Floating elements (AI chat widget) */
  float: "shadow-xl",
} as const;

// ============================================
// 6. TYPOGRAPHY
// ============================================

/** Reusable type scale compositions. */
export const typography = {
  /** h1 — page titles */
  pageTitle: "text-2xl font-bold tracking-tight sm:text-3xl",
  /** h2 — section headings inside pages */
  sectionTitle: "text-xl font-semibold",
  /** h3 — card titles */
  cardTitle: "text-lg font-semibold",
  /** Default body text */
  body: "text-sm",
  /** Body text with medium weight */
  bodyMedium: "text-sm font-medium",
  /** Secondary/helper text */
  caption: "text-xs text-muted-foreground",
  /** Bold caption (badge labels) */
  captionBold: "text-xs font-semibold",
  /** Uppercase label (section labels) */
  label:
    "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
  /** Large display (hero numbers) */
  displayLg: "text-4xl font-bold",
  /** Extra large display (level number) */
  displayXl: "text-6xl font-bold",
} as const;

// ============================================
// 7. SPACING
// ============================================

/** Reusable spacing/layout compositions. */
export const spacing = {
  /** Standard page container — all (app) pages use this */
  pageContainer: "container max-w-4xl px-4 py-6 sm:py-8 md:px-8",
  /** Page header bottom margin */
  pageHeader: "mb-6 sm:mb-8",
  /** Standard section bottom gap */
  sectionGap: "mb-6",
  /** Large section bottom gap — between major page sections */
  sectionGapLg: "mb-8",
  /** Extra large section gap — between categories (preferences) */
  sectionGapXl: "mb-12",
  /** Standard card internal padding */
  cardPadding: "p-4 sm:p-6",
  /** Compact card padding (no responsive step) — stat cards, list items */
  cardPaddingCompact: "p-4",
  /** Wide card padding — assignment cards, reward cards */
  cardPaddingWide: "p-5",
  /** Empty state container padding */
  cardPaddingEmpty: "px-6 py-10",
  /** Vertical stack — default */
  contentStack: "space-y-4",
  /** Vertical stack — tight (lists, notifications) */
  contentStackTight: "space-y-2",
  /** Vertical stack — compact (dashboard features, calendar) */
  contentStackCompact: "space-y-3",
  /** Vertical stack — wide */
  contentStackWide: "space-y-6",
  /** Grid gap — responsive */
  gridGap: "gap-3 sm:gap-4",
  /** Grid gap — compact (3+ column grids) */
  gridGapCompact: "gap-3",
} as const;

// ============================================
// 8. ANIMATION
// ============================================

/** Animation tokens for micro-interactions and transitions. */
export const animation = {
  /** Fast — hovers, presses, toggles (200ms) */
  durationFast: "duration-200",
  /** Normal — entrance/exit (300ms) */
  durationNormal: "duration-300",
  /** Slow — reveals, progress (500ms) */
  durationSlow: "duration-500",
  /** Default easing */
  easeDefault: "ease-out",
  /** Smooth easing (ambient animations) */
  easeSmooth: "ease-in-out",
  /** Playful card hover — scale up on hover, scale down on press */
  hoverScale:
    "transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]",
  /** Subtle card hover — minimal scale */
  hoverScaleSubtle:
    "transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]",
  /** Color transition */
  hoverColors: "transition-colors duration-200",
  /** Fade in (300ms) */
  fadeIn: "animate-fade-in",
  /** Stagger fade in (list items) */
  staggerIn: "animate-stagger-fade-in",
  /** Scroll reveal (500ms) */
  revealUp: "animate-reveal-up",
} as const;

// ============================================
// 9. COMPONENT PRESETS
// ============================================

/** Reusable class compositions for common UI patterns. */
export const presets = {
  /** Stat card container */
  statCard: "rounded-[10px] p-4",
  /** Notice/info card */
  noticeCard: "rounded-2xl bg-[--color-manteca-soft] px-5 py-4",
  /** Feature card base (dashboard) */
  featureCard: "rounded-2xl transition-all duration-200",
} as const;

// ============================================
// 10. ICON SIZES
// ============================================

/** Semantic icon size scale. */
export const iconSize = {
  /** Badges, external link, category indicators */
  xs: "h-3 w-3",
  /** Inline metadata (star, clock, timer) */
  sm: "h-3.5 w-3.5",
  /** Default: buttons, cards, nav items */
  md: "h-4 w-4",
  /** Card headers, section icons, feature cards */
  lg: "h-5 w-5",
  /** Success states, large decorative */
  xl: "h-6 w-6",
  /** Empty state medium */
  "2xl": "h-8 w-8",
  /** Empty state large, hero icons */
  "3xl": "h-12 w-12",
} as const;

// ============================================
// 11. BORDER RADIUS
// ============================================

/** Semantic border radius scale. */
export const radius = {
  /** Standard cards (95% of cards) */
  card: "rounded-2xl",
  /** Compact stat cards */
  cardCompact: "rounded-[10px]",
  /** Badges, avatars, pills, nav bar */
  pill: "rounded-full",
} as const;
