import { StyleSheet } from "react-native";
import {
  colors as newColors,
  darkColors as newDarkColors,
  spacing as tokenSpacing,
  radii as tokenRadii,
  shadows,
  typeScale,
  storeColors,
  storeColorFallback,
  categoryColors,
  categoryColorFallback,
  subcategoryColorOverrides,
  contrastText,
} from "@habita/design-tokens";

// ============================================
// THEME MODE
// ============================================

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedThemeMode = "light" | "dark";

// ============================================
// LIGHT COLORS
// ============================================

const lightColors = {
  // Core semantic — resolved directly from §9.1 tokens
  primary: newColors.monte,
  text: newColors.ink,
  background: newColors.paper,
  card: newColors.surface,
  success: newColors.monte,
  warning: newColors.ladrillo,
  // §9.1 tokens
  paper: newColors.paper,
  surface: newColors.surface,
  line: newColors.line,
  lineSoft: newColors.lineSoft,
  sand: newColors.sand,
  ink: newColors.ink,
  ink2: newColors.ink2,
  ink3: newColors.ink3,
  monte: newColors.monte,
  montePressed: newColors.montePressed,
  monteSoft: newColors.monteSoft,
  ladrillo: newColors.ladrillo,
  ladrilloText: newColors.ladrilloText,
  ladrilloSoft: newColors.ladrilloSoft,
  manteca: newColors.manteca,
  mantecaSoft: newColors.mantecaSoft,
  mantecaText: newColors.mantecaText,
  scrim: newColors.scrim,
  // Extended palette — remapped to the §9.1 neutral palette
  lime: newColors.mantecaSoft,
  lavender: newColors.monteSoft,
  lavenderLight: newColors.monteSoft,
  purpleDark: newColors.ink,
  tan: newColors.sand,
  cream: newColors.sand,
  orange: newColors.ladrillo,
  peach: newColors.ladrilloSoft,
  // Literal white — kept as-is, used as foreground text on colored buttons/badges.
  white: "#ffffff",
  // UI semantic — remapped to the §9.1 neutral palette
  muted: newColors.sand,
  mutedForeground: newColors.ink2,
  border: newColors.line,
  destructive: newColors.ladrillo,
  destructiveForeground: newColors.paper,
  // Overlay
  overlay: newColors.scrim,
  // State backgrounds
  primaryLight: newColors.monteSoft,
  successBg: newColors.monteSoft,
  successText: newColors.monte,
  errorBg: newColors.ladrilloSoft,
  errorText: newColors.ladrilloText,
  warningBg: newColors.mantecaSoft,
  warningText: newColors.mantecaText,
  infoBg: newColors.sand,
  infoText: newColors.ink2,
} as const;

// ============================================
// DARK COLORS
// ============================================

const darkColors = {
  // Core semantic — resolved directly from §9.1 dark tokens
  primary: newDarkColors.monte,
  text: newDarkColors.ink,
  background: newDarkColors.paper,
  card: newDarkColors.surface,
  success: newDarkColors.monte,
  warning: newDarkColors.ladrillo,
  // §9.1 dark tokens
  paper: newDarkColors.paper,
  surface: newDarkColors.surface,
  line: newDarkColors.line,
  lineSoft: newDarkColors.lineSoft,
  sand: newDarkColors.sand,
  ink: newDarkColors.ink,
  ink2: newDarkColors.ink2,
  ink3: newDarkColors.ink3,
  monte: newDarkColors.monte,
  montePressed: newDarkColors.montePressed,
  monteSoft: newDarkColors.monteSoft,
  ladrillo: newDarkColors.ladrillo,
  ladrilloText: newDarkColors.ladrilloText,
  ladrilloSoft: newDarkColors.ladrilloSoft,
  manteca: newDarkColors.manteca,
  mantecaSoft: newDarkColors.mantecaSoft,
  mantecaText: newDarkColors.mantecaText,
  scrim: newDarkColors.scrim,
  // Extended palette — remapped to the §9.1 neutral palette (dark)
  lime: newDarkColors.mantecaSoft,
  lavender: newDarkColors.monteSoft,
  lavenderLight: newDarkColors.monteSoft,
  purpleDark: newDarkColors.ink,
  tan: newDarkColors.sand,
  cream: newDarkColors.sand,
  orange: newDarkColors.ladrillo,
  peach: newDarkColors.ladrilloSoft,
  white: "#ffffff",
  // UI semantic — remapped to the §9.1 neutral palette (dark)
  muted: newDarkColors.sand,
  mutedForeground: newDarkColors.ink2,
  border: newDarkColors.line,
  destructive: newDarkColors.ladrillo,
  destructiveForeground: newDarkColors.paper,
  // Overlay
  overlay: newDarkColors.scrim,
  // State backgrounds
  primaryLight: newDarkColors.monteSoft,
  successBg: newDarkColors.monteSoft,
  successText: newDarkColors.monte,
  errorBg: newDarkColors.ladrilloSoft,
  errorText: newDarkColors.ladrilloText,
  warningBg: newDarkColors.mantecaSoft,
  warningText: newDarkColors.mantecaText,
  infoBg: newDarkColors.sand,
  infoText: newDarkColors.ink2,
} as const;

/** Theme color token keys — same shape for light and dark. */
export type ThemeColors = { [K in keyof typeof lightColors]: string };

/** Get the color set for a resolved theme mode. */
export function getThemeColors(mode: ResolvedThemeMode): ThemeColors {
  return mode === "dark" ? darkColors : lightColors;
}

// ============================================
// BACKWARD-COMPATIBLE STATIC EXPORT (light mode)
// Screens that haven't migrated to useTheme() yet still import this.
// ============================================

export const colors = lightColors;

// ============================================
// SPACING
// ============================================

export const spacing = {
  xs: tokenSpacing.xs,
  sm: tokenSpacing.sm,
  md: tokenSpacing.md,
  lg: tokenSpacing.lg,
  xl: tokenSpacing.xl,
  xxl: tokenSpacing.xxl,
} as const;

// ============================================
// RADIUS
// ============================================

export const radius = {
  sm: tokenRadii.rowIcon,
  md: tokenRadii.control,
  lg: tokenRadii.tile,
  xl: tokenRadii.cardSm,
  xxl: tokenRadii.card,
  "2xl": tokenRadii.dialog,
  full: tokenRadii.full,
} as const;

// ============================================
// FONT FAMILIES
// Static weights: Android ignores `fontWeight` on custom fonts, so each
// weight must be loaded and referenced as its own family (see _layout.tsx).
// ============================================

export const fontFamily = {
  sans: "SchibstedGrotesk-Regular",
  medium: "SchibstedGrotesk-Medium",
  semibold: "SchibstedGrotesk-SemiBold",
  bold: "SchibstedGrotesk-Bold",
} as const;

/** Returns the loaded family name matching a numeric/string font weight. */
export function fontFamilyForWeight(weight: number | string): string {
  const numericWeight = toNumericWeight(weight);
  if (numericWeight >= 700) return fontFamily.bold;
  if (numericWeight >= 600) return fontFamily.semibold;
  if (numericWeight >= 500) return fontFamily.medium;
  return fontFamily.sans;
}

/** RN also accepts the keywords "normal" and "bold" as fontWeight values. */
function toNumericWeight(weight: number | string): number {
  if (typeof weight === "number") return weight;
  if (weight === "bold") return 700;
  return Number.parseInt(weight, 10) || 400;
}

/** Converts a §9.3 `letterSpacing` (em) into React Native points for a given font size. */
function emToPt(size: number, em: number): number {
  return Math.round(size * em * 100) / 100;
}

// ============================================
// TYPOGRAPHY (static, uses light colors — will be refactored per-screen)
// Existing keys are mapped onto the closest §9.3 scale entry; handwritten
// keys are removed (Fase 1 drops the handwritten font).
// ============================================

export const typography = {
  pageTitle: { fontFamily: fontFamilyForWeight(typeScale.H1.weight), fontSize: typeScale.H1.size, letterSpacing: emToPt(typeScale.H1.size, typeScale.H1.letterSpacing), color: colors.text },
  sectionTitle: { fontFamily: fontFamilyForWeight(typeScale.T1.weight), fontSize: typeScale.T1.size, letterSpacing: emToPt(typeScale.T1.size, typeScale.T1.letterSpacing), color: colors.text },
  cardTitle: { fontFamily: fontFamilyForWeight(typeScale.T1.weight), fontSize: typeScale.T1.size, letterSpacing: emToPt(typeScale.T1.size, typeScale.T1.letterSpacing), color: colors.text },
  body: { fontFamily: fontFamilyForWeight(typeScale.B1.weight), fontSize: typeScale.B1.size, color: colors.text },
  bodyMedium: { fontFamily: fontFamilyForWeight(typeScale.T2.weight), fontSize: typeScale.T2.size, color: colors.text },
  bodySemibold: { fontFamily: fontFamilyForWeight(typeScale.T1.weight), fontSize: typeScale.T1.size, color: colors.text },
  caption: { fontFamily: fontFamilyForWeight(typeScale.B2.weight), fontSize: typeScale.B2.size, color: colors.mutedForeground },
  captionMedium: { fontFamily: fontFamilyForWeight(500), fontSize: typeScale.B2.size, color: colors.mutedForeground },
  captionBold: { fontFamily: fontFamilyForWeight(600), fontSize: typeScale.B2.size, color: colors.text },
  label: { fontFamily: fontFamilyForWeight(typeScale.L1.weight), fontSize: typeScale.L1.size, textTransform: "uppercase" as const, letterSpacing: emToPt(typeScale.L1.size, typeScale.L1.letterSpacing), color: colors.mutedForeground },
  displayLg: { fontFamily: fontFamilyForWeight(typeScale.D2.weight), fontSize: typeScale.D2.size, letterSpacing: emToPt(typeScale.D2.size, typeScale.D2.letterSpacing), color: colors.text },
  displayMd: { fontFamily: fontFamilyForWeight(typeScale.H1.weight), fontSize: typeScale.H1.size, letterSpacing: emToPt(typeScale.H1.size, typeScale.H1.letterSpacing), color: colors.text },
  // §9.3 scale, direct keys
  d1: { fontFamily: fontFamilyForWeight(typeScale.D1.weight), fontSize: typeScale.D1.size, letterSpacing: emToPt(typeScale.D1.size, typeScale.D1.letterSpacing), color: colors.text },
  d2: { fontFamily: fontFamilyForWeight(typeScale.D2.weight), fontSize: typeScale.D2.size, letterSpacing: emToPt(typeScale.D2.size, typeScale.D2.letterSpacing), color: colors.text },
  h1: { fontFamily: fontFamilyForWeight(typeScale.H1.weight), fontSize: typeScale.H1.size, letterSpacing: emToPt(typeScale.H1.size, typeScale.H1.letterSpacing), color: colors.text },
  t1: { fontFamily: fontFamilyForWeight(typeScale.T1.weight), fontSize: typeScale.T1.size, letterSpacing: emToPt(typeScale.T1.size, typeScale.T1.letterSpacing), color: colors.text },
  t2: { fontFamily: fontFamilyForWeight(typeScale.T2.weight), fontSize: typeScale.T2.size, color: colors.text },
  b1: { fontFamily: fontFamilyForWeight(typeScale.B1.weight), fontSize: typeScale.B1.size, color: colors.text },
  b2: { fontFamily: fontFamilyForWeight(typeScale.B2.weight), fontSize: typeScale.B2.size, color: colors.mutedForeground },
  l1: { fontFamily: fontFamilyForWeight(typeScale.L1.weight), fontSize: typeScale.L1.size, textTransform: "uppercase" as const, letterSpacing: emToPt(typeScale.L1.size, typeScale.L1.letterSpacing), color: colors.mutedForeground },
} as const;

/** Create typography styles with theme-aware colors. */
export function createTypography(themeColors: ThemeColors) {
  return {
    pageTitle: { fontFamily: fontFamilyForWeight(typeScale.H1.weight), fontSize: typeScale.H1.size, letterSpacing: emToPt(typeScale.H1.size, typeScale.H1.letterSpacing), color: themeColors.text },
    sectionTitle: { fontFamily: fontFamilyForWeight(typeScale.T1.weight), fontSize: typeScale.T1.size, letterSpacing: emToPt(typeScale.T1.size, typeScale.T1.letterSpacing), color: themeColors.text },
    cardTitle: { fontFamily: fontFamilyForWeight(typeScale.T1.weight), fontSize: typeScale.T1.size, letterSpacing: emToPt(typeScale.T1.size, typeScale.T1.letterSpacing), color: themeColors.text },
    body: { fontFamily: fontFamilyForWeight(typeScale.B1.weight), fontSize: typeScale.B1.size, color: themeColors.text },
    bodyMedium: { fontFamily: fontFamilyForWeight(typeScale.T2.weight), fontSize: typeScale.T2.size, color: themeColors.text },
    bodySemibold: { fontFamily: fontFamilyForWeight(typeScale.T1.weight), fontSize: typeScale.T1.size, color: themeColors.text },
    caption: { fontFamily: fontFamilyForWeight(typeScale.B2.weight), fontSize: typeScale.B2.size, color: themeColors.mutedForeground },
    captionMedium: { fontFamily: fontFamilyForWeight(500), fontSize: typeScale.B2.size, color: themeColors.mutedForeground },
    captionBold: { fontFamily: fontFamilyForWeight(600), fontSize: typeScale.B2.size, color: themeColors.text },
    label: { fontFamily: fontFamilyForWeight(typeScale.L1.weight), fontSize: typeScale.L1.size, textTransform: "uppercase" as const, letterSpacing: emToPt(typeScale.L1.size, typeScale.L1.letterSpacing), color: themeColors.mutedForeground },
    displayLg: { fontFamily: fontFamilyForWeight(typeScale.D2.weight), fontSize: typeScale.D2.size, letterSpacing: emToPt(typeScale.D2.size, typeScale.D2.letterSpacing), color: themeColors.text },
    displayMd: { fontFamily: fontFamilyForWeight(typeScale.H1.weight), fontSize: typeScale.H1.size, letterSpacing: emToPt(typeScale.H1.size, typeScale.H1.letterSpacing), color: themeColors.text },
    d1: { fontFamily: fontFamilyForWeight(typeScale.D1.weight), fontSize: typeScale.D1.size, letterSpacing: emToPt(typeScale.D1.size, typeScale.D1.letterSpacing), color: themeColors.text },
    d2: { fontFamily: fontFamilyForWeight(typeScale.D2.weight), fontSize: typeScale.D2.size, letterSpacing: emToPt(typeScale.D2.size, typeScale.D2.letterSpacing), color: themeColors.text },
    h1: { fontFamily: fontFamilyForWeight(typeScale.H1.weight), fontSize: typeScale.H1.size, letterSpacing: emToPt(typeScale.H1.size, typeScale.H1.letterSpacing), color: themeColors.text },
    t1: { fontFamily: fontFamilyForWeight(typeScale.T1.weight), fontSize: typeScale.T1.size, letterSpacing: emToPt(typeScale.T1.size, typeScale.T1.letterSpacing), color: themeColors.text },
    t2: { fontFamily: fontFamilyForWeight(typeScale.T2.weight), fontSize: typeScale.T2.size, color: themeColors.text },
    b1: { fontFamily: fontFamilyForWeight(typeScale.B1.weight), fontSize: typeScale.B1.size, color: themeColors.text },
    b2: { fontFamily: fontFamilyForWeight(typeScale.B2.weight), fontSize: typeScale.B2.size, color: themeColors.mutedForeground },
    l1: { fontFamily: fontFamilyForWeight(typeScale.L1.weight), fontSize: typeScale.L1.size, textTransform: "uppercase" as const, letterSpacing: emToPt(typeScale.L1.size, typeScale.L1.letterSpacing), color: themeColors.mutedForeground },
  } as const;
}

// ============================================
// COMMON STYLES (static, backward-compatible)
// ============================================

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenPadded: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  contentPadding: {
    paddingHorizontal: spacing.lg,
  },
  sectionGap: {
    marginBottom: spacing.xxl,
  },
  sectionGapSm: {
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    ...shadows.card,
  },
  cardPadding: {
    padding: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowSpaceBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
});

// ============================================
// RE-EXPORTS
// ============================================

export {
  storeColors,
  storeColorFallback,
  categoryColors,
  categoryColorFallback,
  subcategoryColorOverrides,
  contrastText,
  shadows,
};
