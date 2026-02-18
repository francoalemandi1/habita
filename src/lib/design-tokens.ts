/**
 * Habita Design System Tokens
 *
 * Single source of truth for colors, typography, spacing, shadows, and animations.
 * IMPORTANT: Raw hex values in `palette` MUST stay in sync with the CSS custom
 * properties defined in src/app/globals.css (:root --brand-* variables).
 * When changing a color, update BOTH files.
 */

// ============================================
// 1. COLOR PALETTE (raw hex values)
// ============================================

/** Raw hex palette — use for canvas, SVG, and inline styles where Tailwind classes cannot be used. */
export const palette = {
  primary: "#5260fe",
  primaryLight: "#626efe",
  lime: "#d2ffa0",
  successDark: "#7aa649",
  lavender: "#d0b6ff",
  lavenderLight: "#e4d5ff",
  purpleDark: "#522a97",
  foregroundDark: "#272727",
  tan: "#ffe8c3",
  cream: "#fff0d7",
  background: "#fff7ea",
  orange: "#fd7c52",
  peach: "#fed9cb",
  white: "#ffffff",
} as const;

// ============================================
// 2. CYCLING COLORS (member/segment assignment)
// ============================================

/** Color cycle for member avatars, roulette segments, calendar badges. */
export const cyclingColors = [
  palette.primary,
  palette.lime,
  palette.lavender,
  "#ff9f43",
  "#ff6b6b",
  "#54a0ff",
  "#ffd32a",
  "#ff9ff3",
] as const;

/** Text colors that contrast against each cyclingColors entry. */
export const cyclingTextColors = [
  palette.white,
  palette.foregroundDark,
  palette.foregroundDark,
  palette.white,
  palette.white,
  palette.white,
  palette.foregroundDark,
  palette.foregroundDark,
] as const;

// ============================================
// 2b. WHEEL COLORS (richer palette for roulette)
// ============================================

/** Richer versions of the brand palette for the roulette wheel — deep enough for white text. */
export const wheelColors = [
  "#5260fe", // brand primary (indigo)
  "#fd7c52", // brand orange
  "#522a97", // brand purple-dark
  "#7aa649", // brand success-dark (deep lime)
  "#d0a0ff", // brand lavender (saturated)
  "#e0952a", // deep golden (from brand tan family)
  "#626efe", // brand primary-light
  "#c94040", // deep coral (from cycling red family)
  "#8b5cf6", // grape (lavender-purple bridge)
  "#d48c00", // amber (from cycling amber family)
  "#4080d0", // steel blue (from cycling blue family)
  "#e06090", // rose (from cycling pink family)
] as const;

/** Text colors for each wheelColors entry. */
export const wheelTextColors: readonly string[] = [
  "#ffffff", // indigo → white
  "#ffffff", // orange → white
  "#ffffff", // purple-dark → white
  "#ffffff", // deep lime → white
  "#272727", // lavender → dark
  "#ffffff", // deep golden → white
  "#ffffff", // primary-light → white
  "#ffffff", // deep coral → white
  "#ffffff", // grape → white
  "#ffffff", // amber → white
  "#ffffff", // steel blue → white
  "#ffffff", // rose → white
];

// ============================================
// 3. CONTRAST HELPERS
// ============================================

const LIGHT_BACKGROUNDS = new Set([
  palette.lime,
  palette.lavender,
  palette.tan,
  palette.cream,
  palette.lavenderLight,
  palette.peach,
  "#ffd32a",
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

/** Assignment card colors — used by my-assignments-list. */
export const assignmentCardColors = [
  {
    bg: "bg-[#5260fe]",
    text: "text-white",
    meta: "text-white/85",
    btnBg: "bg-white/20 hover:bg-white/30 text-white",
  },
  {
    bg: "bg-[#d2ffa0]",
    text: "text-[#272727]",
    meta: "text-[#272727]/80",
    btnBg: "bg-[#272727]/10 hover:bg-[#272727]/20 text-[#272727]",
  },
  {
    bg: "bg-[#d0b6ff]",
    text: "text-[#272727]",
    meta: "text-[#272727]/80",
    btnBg: "bg-[#272727]/10 hover:bg-[#272727]/20 text-[#272727]",
  },
] as const;

/** Member reward card colors — used by plan-rewards-section. */
export const memberRewardColors = [
  { bg: "bg-[#d2ffa0]/50", text: "text-[#272727]", rewardBg: "bg-white/70" },
  { bg: "bg-[#d0b6ff]/40", text: "text-[#522a97]", rewardBg: "bg-white/70" },
  { bg: "bg-[#ffe8c3]/60", text: "text-[#272727]", rewardBg: "bg-white/70" },
  { bg: "bg-[#e4d5ff]/40", text: "text-[#272727]", rewardBg: "bg-white/70" },
] as const;

// ── 4b. STORE BRAND COLORS (supermarket comparison) ──

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

/** Notification type → style mapping. */
export const notificationStyles: Record<
  string,
  { bg: string; iconColor: string }
> = {
  TRANSFER_REQUEST: { bg: "bg-[#e4d5ff]/50", iconColor: "text-primary" },
  TRANSFER_ACCEPTED: { bg: "bg-[#d2ffa0]/40", iconColor: "text-green-600" },
  TRANSFER_REJECTED: { bg: "bg-red-50", iconColor: "text-red-500" },
  TASK_OVERDUE: { bg: "bg-[#fff0d7]", iconColor: "text-red-500" },
  ACHIEVEMENT_UNLOCKED: { bg: "bg-[#fff0d7]", iconColor: "text-yellow-500" },
  LEVEL_UP: { bg: "bg-[#d2ffa0]/40", iconColor: "text-green-500" },
  REMINDER_DUE: { bg: "bg-blue-50", iconColor: "text-blue-500" },
  PLAN_READY: { bg: "bg-[#e4d5ff]/50", iconColor: "text-primary" },
  PLAN_APPLIED: { bg: "bg-[#d2ffa0]/40", iconColor: "text-green-600" },
  REWARD_REDEEMED: { bg: "bg-[#fff0d7]", iconColor: "text-yellow-500" },
};

export const notificationStyleDefault = {
  bg: "bg-muted/50",
  iconColor: "text-muted-foreground",
} as const;

/** Priority badge colors — used by AI suggestions. */
export const priorityColors = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
} as const;

/** Stat card colors — bg + text for each branded card variant. */
export const statCardColors = {
  purple: { bg: "bg-[#d0b6ff]", text: "text-[#522a97]" },
  lime: { bg: "bg-[#d2ffa0]", text: "text-[#272727]" },
  tan: { bg: "bg-[#ffe8c3]", text: "text-[#272727]" },
  cream: { bg: "bg-[#fff0d7]", text: "text-[#272727]" },
  primary: { bg: "bg-[#5260fe]", text: "text-white" },
  orange: { bg: "bg-[#fd7c52]", text: "text-white" },
  lavenderLight: { bg: "bg-[#e4d5ff]", text: "text-[#522a97]" },
} as const;

// ============================================
// 5. SHADOWS
// ============================================

/** Semantic shadow scale. */
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
  /** Notice/info card (cream background) */
  noticeCard: "rounded-2xl bg-[#fff0d7] px-5 py-4",
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
