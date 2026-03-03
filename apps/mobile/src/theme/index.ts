import { StyleSheet } from "react-native";
import {
  semanticColors,
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
// COLORS
// ============================================

export const colors = {
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
  primaryLight: "#eef2ff", // active/selected state bg (indigo-50)
  successBg: "#dcfce7", // green-100
  successText: "#16a34a", // green-600
  errorBg: "#fee2e2", // red-100
  errorText: "#b91c1c", // red-700
  warningBg: "#fef3c7", // amber-100
  warningText: "#92400e", // amber-800
  infoBg: "#dbeafe", // blue-100
  infoText: "#2563eb", // blue-600
} as const;

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
// TYPOGRAPHY
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

// ============================================
// COMMON STYLES
// ============================================

export const commonStyles = StyleSheet.create({
  // Screen containers
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenPadded: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  // Content areas
  contentPadding: {
    paddingHorizontal: spacing.lg,
  },
  // Gaps
  sectionGap: {
    marginBottom: spacing.xxl,
  },
  sectionGapSm: {
    marginBottom: spacing.lg,
  },
  // Card base
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    ...shadows.card,
  },
  cardPadding: {
    padding: spacing.lg,
  },
  // Row layouts
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowSpaceBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // Centered
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
