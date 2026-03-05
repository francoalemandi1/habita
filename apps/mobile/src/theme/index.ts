import { StyleSheet } from "react-native";
import {
  semanticColors,
  darkSemanticColors,
  spacingScale,
  radiusScale,
  palette,
  shadows,
  cyclingColors,
  cyclingTextColors,
  assignmentCardColors,
  statCardColors,
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
  // Core semantic
  ...semanticColors,
  // Extended palette
  lime: palette.lime,
  lavender: palette.lavender,
  lavenderLight: palette.lavenderLight,
  purpleDark: palette.purpleDark,
  tan: palette.tan,
  cream: palette.cream,
  orange: palette.orange,
  peach: palette.peach,
  white: palette.white,
  // UI semantic
  muted: "#f0ebe0",
  mutedForeground: "#595959",
  border: "#e2d8ce",
  destructive: "#ef4444",
  destructiveForeground: "#fef2f2",
  // Overlay
  overlay: "rgba(0,0,0,0.4)",
  // State backgrounds
  primaryLight: "#eef2ff",
  successBg: "#dcfce7",
  successText: "#16a34a",
  errorBg: "#fee2e2",
  errorText: "#b91c1c",
  warningBg: "#fef3c7",
  warningText: "#92400e",
  infoBg: "#dbeafe",
  infoText: "#2563eb",
} as const;

// ============================================
// DARK COLORS
// ============================================

const darkColors = {
  // Core semantic
  ...darkSemanticColors,
  // Extended palette — adjusted for dark backgrounds
  lime: "#c5f07a",
  lavender: "#c4a8f0",
  lavenderLight: "#d8c9f5",
  purpleDark: "#a78bfa",
  tan: "#3d3520",
  cream: "#3d3520",
  orange: "#fd9a7a",
  peach: "#4a2a1e",
  white: "#ffffff",
  // UI semantic
  muted: "#2a2b30",         // hsl(220 13% 16%)
  mutedForeground: "#999999", // hsl(0 0% 60%)
  border: "#333540",         // hsl(220 13% 22%)
  destructive: "#b91c1c",    // darker red on dark bg
  destructiveForeground: "#3b1010",
  // Overlay
  overlay: "rgba(0,0,0,0.6)",
  // State backgrounds — muted for dark mode
  primaryLight: "#1e1f3a",   // dark indigo wash
  successBg: "#0f2a16",      // dark green wash
  successText: "#4ade80",    // bright green
  errorBg: "#2d1010",        // dark red wash
  errorText: "#fca5a5",      // light red
  warningBg: "#2d2010",      // dark amber wash
  warningText: "#fbbf24",    // bright amber
  infoBg: "#101d2d",         // dark blue wash
  infoText: "#60a5fa",       // bright blue
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

export const spacing = spacingScale;

// ============================================
// RADIUS
// ============================================

export const radius = radiusScale;

// ============================================
// FONT FAMILIES
// ============================================

export const fontFamily = {
  sans: "DMSans",
  handwritten: "Caveat",
} as const;

// ============================================
// TYPOGRAPHY (static, uses light colors — will be refactored per-screen)
// ============================================

export const typography = {
  pageTitle: { fontFamily: fontFamily.sans, fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.3, color: colors.text },
  sectionTitle: { fontFamily: fontFamily.sans, fontSize: 20, fontWeight: "600" as const, color: colors.text },
  cardTitle: { fontFamily: fontFamily.sans, fontSize: 18, fontWeight: "600" as const, color: colors.text },
  body: { fontFamily: fontFamily.sans, fontSize: 14, color: colors.text },
  bodyMedium: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "500" as const, color: colors.text },
  bodySemibold: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "600" as const, color: colors.text },
  caption: { fontFamily: fontFamily.sans, fontSize: 12, color: colors.mutedForeground },
  captionMedium: { fontFamily: fontFamily.sans, fontSize: 12, fontWeight: "500" as const, color: colors.mutedForeground },
  captionBold: { fontFamily: fontFamily.sans, fontSize: 12, fontWeight: "600" as const, color: colors.text },
  label: { fontFamily: fontFamily.sans, fontSize: 11, fontWeight: "600" as const, textTransform: "uppercase" as const, letterSpacing: 0.5, color: colors.mutedForeground },
  displayLg: { fontFamily: fontFamily.sans, fontSize: 32, fontWeight: "700" as const, color: colors.text },
  displayMd: { fontFamily: fontFamily.sans, fontSize: 22, fontWeight: "700" as const, color: colors.text },
  handwritten: { fontFamily: fontFamily.handwritten, fontSize: 16, color: colors.text },
  handwrittenLg: { fontFamily: fontFamily.handwritten, fontSize: 20, color: colors.text },
} as const;

/** Create typography styles with theme-aware colors. */
export function createTypography(themeColors: ThemeColors) {
  return {
    pageTitle: { fontFamily: fontFamily.sans, fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.3, color: themeColors.text },
    sectionTitle: { fontFamily: fontFamily.sans, fontSize: 20, fontWeight: "600" as const, color: themeColors.text },
    cardTitle: { fontFamily: fontFamily.sans, fontSize: 18, fontWeight: "600" as const, color: themeColors.text },
    body: { fontFamily: fontFamily.sans, fontSize: 14, color: themeColors.text },
    bodyMedium: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "500" as const, color: themeColors.text },
    bodySemibold: { fontFamily: fontFamily.sans, fontSize: 14, fontWeight: "600" as const, color: themeColors.text },
    caption: { fontFamily: fontFamily.sans, fontSize: 12, color: themeColors.mutedForeground },
    captionMedium: { fontFamily: fontFamily.sans, fontSize: 12, fontWeight: "500" as const, color: themeColors.mutedForeground },
    captionBold: { fontFamily: fontFamily.sans, fontSize: 12, fontWeight: "600" as const, color: themeColors.text },
    label: { fontFamily: fontFamily.sans, fontSize: 11, fontWeight: "600" as const, textTransform: "uppercase" as const, letterSpacing: 0.5, color: themeColors.mutedForeground },
    displayLg: { fontFamily: fontFamily.sans, fontSize: 32, fontWeight: "700" as const, color: themeColors.text },
    displayMd: { fontFamily: fontFamily.sans, fontSize: 22, fontWeight: "700" as const, color: themeColors.text },
    handwritten: { fontFamily: fontFamily.handwritten, fontSize: 16, color: themeColors.text },
    handwrittenLg: { fontFamily: fontFamily.handwritten, fontSize: 20, color: themeColors.text },
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
  cyclingColors,
  cyclingTextColors,
  assignmentCardColors,
  statCardColors,
  storeColors,
  storeColorFallback,
  categoryColors,
  categoryColorFallback,
  subcategoryColorOverrides,
  contrastText,
  shadows,
  palette,
};
