export const semanticColors = {
  primary: "#5260fe",
  primaryLight: "#626efe",
  text: "#272727",
  background: "#fff7ea",
  card: "#ffffff",
  success: "#7aa649",
  warning: "#fd7c52",
} as const;

/** Dark mode semantic colors — aligned with web `.dark` CSS variables. */
export const darkSemanticColors = {
  primary: "#7b86fe",     // hsl(234 99% 72%) — lighter for dark bg
  primaryLight: "#8a94fe",
  text: "#ede5d8",        // hsl(39 30% 93%) — warm light text
  background: "#191a1e",  // hsl(220 13% 10%)
  card: "#202125",        // hsl(220 13% 13%)
  success: "#4ade80",     // hsl(142 71% 40%)
  warning: "#fd9a7a",
} as const;

export const spacingScale = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radiusScale = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  "2xl": 24,
  full: 999,
} as const;

export const typographyScale = {
  titleLg: 24,
  titleMd: 20,
  body: 14,
  caption: 12,
} as const;

// ============================================
// EXTENDED PALETTE (raw hex values)
// ============================================

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
// CYCLING COLORS (member avatars, segments)
// ============================================

export const cyclingColors = [
  "#5260fe",
  "#d2ffa0",
  "#d0b6ff",
  "#ff9f43",
  "#ff6b6b",
  "#54a0ff",
  "#ffd32a",
  "#ff9ff3",
] as const;

export const cyclingTextColors = [
  "#ffffff",
  "#272727",
  "#272727",
  "#ffffff",
  "#ffffff",
  "#ffffff",
  "#272727",
  "#272727",
] as const;

// ============================================
// ASSIGNMENT CARD COLORS
// ============================================

export const assignmentCardColors = [
  {
    bg: "#5260fe",
    text: "#ffffff",
    meta: "rgba(255,255,255,0.85)",
    btnBg: "rgba(255,255,255,0.2)",
  },
  {
    bg: "#d2ffa0",
    text: "#272727",
    meta: "rgba(39,39,39,0.8)",
    btnBg: "rgba(39,39,39,0.1)",
  },
  {
    bg: "#d0b6ff",
    text: "#272727",
    meta: "rgba(39,39,39,0.8)",
    btnBg: "rgba(39,39,39,0.1)",
  },
] as const;

// ============================================
// STAT CARD COLORS
// ============================================

export const statCardColors = {
  purple: { bg: "#d0b6ff", text: "#522a97" },
  lime: { bg: "#d2ffa0", text: "#272727" },
  tan: { bg: "#ffe8c3", text: "#272727" },
  cream: { bg: "#fff0d7", text: "#272727" },
  primary: { bg: "#5260fe", text: "#ffffff" },
  orange: { bg: "#fd7c52", text: "#ffffff" },
  lavenderLight: { bg: "#e4d5ff", text: "#522a97" },
} as const;

// ============================================
// EXPENSE CATEGORY COLORS
// ============================================

export const categoryColors: Record<string, { bg: string; text: string; bar: string }> = {
  GROCERIES: { bg: "#dcfce7", text: "#16a34a", bar: "#22c55e" },
  UTILITIES: { bg: "#fef9c3", text: "#ca8a04", bar: "#eab308" },
  RENT: { bg: "#dbeafe", text: "#2563eb", bar: "#3b82f6" },
  FOOD: { bg: "#ffedd5", text: "#ea580c", bar: "#f97316" },
  TRANSPORT: { bg: "#e0f2fe", text: "#0284c7", bar: "#0ea5e9" },
  HEALTH: { bg: "#fee2e2", text: "#dc2626", bar: "#ef4444" },
  ENTERTAINMENT: { bg: "#f3e8ff", text: "#9333ea", bar: "#a855f7" },
  EDUCATION: { bg: "#e0e7ff", text: "#4f46e5", bar: "#6366f1" },
  HOME: { bg: "#f5f5f4", text: "#57534e", bar: "#78716c" },
  OTHER: { bg: "#f3f4f6", text: "#4b5563", bar: "#9ca3af" },
};

export const categoryColorFallback = { bg: "#f3f4f6", text: "#4b5563", bar: "#9ca3af" } as const;

export const subcategoryColorOverrides: Record<string, { bg: string; text: string }> = {
  DELIVERY: { bg: "#ffedd5", text: "#ea580c" },
  KIOSCO: { bg: "#fae8ff", text: "#c026d3" },
  SUPERMARKET: { bg: "#dcfce7", text: "#16a34a" },
};

// ============================================
// STORE BRAND COLORS
// ============================================

export const storeColors: Record<string, { bg: string; text: string }> = {
  Carrefour: { bg: "#003da5", text: "#ffffff" },
  Coto: { bg: "#e31837", text: "#ffffff" },
  Dia: { bg: "#d52b1e", text: "#ffffff" },
  Disco: { bg: "#0066b2", text: "#ffffff" },
  Jumbo: { bg: "#009b3a", text: "#ffffff" },
  "Mas Online": { bg: "#522a97", text: "#ffffff" },
  Vea: { bg: "#fd7c52", text: "#ffffff" },
  HiperLibertad: { bg: "#e31837", text: "#ffffff" },
  Cordiez: { bg: "#7aa649", text: "#ffffff" },
  Toledo: { bg: "#4080d0", text: "#ffffff" },
  "Coop. Obrera": { bg: "#5260fe", text: "#ffffff" },
};

export const storeColorFallback = { bg: "#595959", text: "#ffffff" } as const;

// ============================================
// SHADOWS (React Native format)
// ============================================

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
// CONTRAST HELPER
// ============================================

const LIGHT_BACKGROUNDS = new Set([
  "#d2ffa0",
  "#d0b6ff",
  "#ffe8c3",
  "#fff0d7",
  "#e4d5ff",
  "#fed9cb",
  "#ffd32a",
]);

/** Returns white or dark text depending on the background color. */
export function contrastText(backgroundHex: string): string {
  return LIGHT_BACKGROUNDS.has(backgroundHex) ? "#272727" : "#ffffff";
}
