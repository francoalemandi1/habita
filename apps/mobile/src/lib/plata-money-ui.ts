import type { TextStyle } from "react-native";
import { fontFamilyForWeight } from "@/theme";
import type { ThemeColors } from "@/theme";

/** §9.3 L1 — shared section label style for "Entre ustedes" / "Historial" / "Cuotas del mes" rows. */
export function sectionLabelStyle(c: ThemeColors): TextStyle {
  return {
    fontFamily: fontFamilyForWeight(600),
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 11 * 0.08,
    color: c.ink2,
  };
}
