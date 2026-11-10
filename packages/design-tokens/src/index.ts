/**
 * Habita Design System Tokens — Rebrand (Fase 1, §9)
 *
 * Single source of truth for colors, typography, spacing, radii, shadows and motion.
 * Deprecated exports below are kept so unmigrated screens keep compiling; they
 * resolve to the new tokens and will be removed in Fase 9 (cleanup).
 */

// ============================================
// 1. NEW SEMANTIC COLORS (§9.1)
// ============================================

export const colors = {
  paper: "#F3EFE7",
  surface: "#FFFDF9",
  line: "#E4DED2",
  lineSoft: "#EEE8DD",
  sand: "#ECE6DA",
  ink: "#1D2620",
  ink2: "#5C665F",
  ink3: "#8D958F",
  monte: "#2E5A45",
  montePressed: "#264B3A",
  monteSoft: "#DCE6DC",
  ladrillo: "#C4553B",
  ladrilloText: "#A23E27",
  ladrilloSoft: "#F5DFD7",
  manteca: "#F0D488",
  mantecaSoft: "#FAF0CF",
  mantecaText: "#6B5310",
  scrim: "rgba(29,38,32,.4)",
} as const;

export const darkColors = {
  paper: "#121813",
  surface: "#1B231D",
  line: "#2A352E",
  lineSoft: "#232C25",
  sand: "#232C25",
  ink: "#ECE6DA",
  ink2: "#A3ACA5",
  ink3: "#7A847D",
  monte: "#7DB394",
  montePressed: "#6A9E80",
  monteSoft: "#1F3329",
  ladrillo: "#E8866E",
  ladrilloText: "#E8866E",
  ladrilloSoft: "#3A2420",
  manteca: "#F0D488",
  mantecaSoft: "#3A3320",
  mantecaText: "#F0D488",
  scrim: "rgba(0,0,0,.6)",
} as const;

// ============================================
// 2. SPACING, RADII, SHADOWS (§9.2)
// ============================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radii = {
  checkbox: 6,
  rowIcon: 10,
  control: 12,
  tile: 14,
  cardSm: 16,
  card: 20,
  dialog: 24,
  sheet: 28,
  full: 999,
} as const;

/** CSS box-shadow strings, per §9.2. */
export const shadowTokens = {
  level1: "0 1px 2px rgba(29,38,32,.06), 0 8px 24px -8px rgba(29,38,32,.18)",
  level2: "0 24px 64px -12px rgba(29,38,32,.32)",
} as const;

// ============================================
// 3. TYPOGRAPHY — Schibsted Grotesk (§9.3)
// ============================================

export const typeScale = {
  D1: { size: 56, weight: 700, lineHeight: 0.95, letterSpacing: -0.04 },
  D2: { size: 32, weight: 700, lineHeight: 1.05, letterSpacing: -0.035 },
  pageTitle: { size: 30, weight: 700, letterSpacing: -0.035 },
  H1: { size: 22, weight: 700, letterSpacing: -0.02 },
  T1: { size: 17, weight: 600, letterSpacing: -0.01 },
  T2: { size: 16, weight: 500, letterSpacing: 0 },
  B1: { size: 15, weight: 400, letterSpacing: 0 },
  B2: { size: 13, weight: 400, letterSpacing: 0 },
  L1: { size: 11, weight: 600, letterSpacing: 0.08 },
} as const;

// ============================================
// 4. MOTION (§8.1 / §8.2)
// ============================================

export const motion = {
  duration: {
    instant: 100,
    quick: 180,
    base: 260,
    slow: 420,
  },
  easing: {
    enter: [0.2, 0, 0, 1],
    exit: [0.4, 0, 1, 1],
    move: [0.3, 0, 0, 1],
  },
  sheetSpring: {
    damping: 28,
    stiffness: 300,
  },
} as const;

// ============================================
// 5. CATEGORY COLORS — used by category badges
// ============================================

/** @deprecated Expense categories are now distinguished by icon, not color (§9). */
export const categoryColors: Record<string, { bg: string; text: string; bar: string }> = {
  GROCERIES: { bg: colors.monteSoft, text: colors.ink, bar: colors.monte },
  UTILITIES: { bg: colors.mantecaSoft, text: colors.mantecaText, bar: colors.manteca },
  RENT: { bg: colors.sand, text: colors.ink, bar: colors.ink2 },
  FOOD: { bg: colors.mantecaSoft, text: colors.mantecaText, bar: colors.manteca },
  TRANSPORT: { bg: colors.sand, text: colors.ink, bar: colors.ink2 },
  HEALTH: { bg: colors.ladrilloSoft, text: colors.ladrilloText, bar: colors.ladrillo },
  ENTERTAINMENT: { bg: colors.monteSoft, text: colors.ink, bar: colors.monte },
  EDUCATION: { bg: colors.sand, text: colors.ink, bar: colors.ink2 },
  HOME: { bg: colors.line, text: colors.ink2, bar: colors.ink3 },
  OTHER: { bg: colors.line, text: colors.ink2, bar: colors.ink3 },
};

/** @deprecated Use `colors.line` / `colors.ink2` directly. */
export const categoryColorFallback = { bg: colors.line, text: colors.ink2, bar: colors.ink3 } as const;

/** @deprecated Neutral replacement for subcategory badges. */
export const subcategoryColorOverrides: Record<string, { bg: string; text: string }> = {
  DELIVERY: { bg: colors.mantecaSoft, text: colors.mantecaText },
  KIOSCO: { bg: colors.monteSoft, text: colors.ink },
  SUPERMARKET: { bg: colors.monteSoft, text: colors.ink },
};

// ============================================
// 6. STORE BRAND COLORS — UNCHANGED (third-party brand colors)
// ============================================

export const storeColors: Record<string, { bg: string; text: string }> = {
  // Text must reach 4.5:1 on the badge: keep the brand fill and switch to dark text when that
  // passes (Vea, Cordiez); otherwise darken the fill just enough for white (Jumbo, Toledo).
  Carrefour: { bg: "#003da5", text: "#ffffff" },
  Coto: { bg: "#e31837", text: "#ffffff" },
  Dia: { bg: "#d52b1e", text: "#ffffff" },
  Disco: { bg: "#0066b2", text: "#ffffff" },
  Jumbo: { bg: "#008732", text: "#ffffff" },
  "Mas Online": { bg: "#522a97", text: "#ffffff" },
  Vea: { bg: "#fd7c52", text: colors.ink },
  HiperLibertad: { bg: "#e31837", text: "#ffffff" },
  Cordiez: { bg: "#7aa649", text: colors.ink },
  Toledo: { bg: "#3275ca", text: "#ffffff" },
  "Coop. Obrera": { bg: "#5260fe", text: "#ffffff" },
};

export const storeColorFallback = { bg: "#595959", text: "#ffffff" } as const;

// ============================================
// 7. SHADOWS (React Native format) — deprecated, use `shadowTokens`
// ============================================

/** @deprecated React Native shadow objects for legacy screens; prefer `shadowTokens` (web) or theme shadow styles (mobile). */
export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHover: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  elevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// ============================================
// 8. CONTRAST HELPER
// ============================================

const LIGHT_BACKGROUNDS = new Set<string>([
  colors.sand,
  colors.monteSoft,
  colors.mantecaSoft,
  colors.ladrilloSoft,
]);

/** Returns the appropriate foreground hex for a given background hex. */
export function contrastText(backgroundHex: string): string {
  return LIGHT_BACKGROUNDS.has(backgroundHex) ? colors.ink : colors.paper;
}
