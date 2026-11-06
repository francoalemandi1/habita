import { SegmentedControl } from "@/components/ds";
import { useTheme } from "@/hooks/use-theme";

import type { ThemeMode } from "@/theme";

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

/** §5.3 Perfil — Apariencia row, backed by ThemeProvider's setMode. */
export function ThemeRow(): React.JSX.Element {
  const { mode, setMode } = useTheme();

  return (
    <SegmentedControl options={THEME_OPTIONS} value={mode} onValueChange={setMode} accessibilityLabel="Apariencia" />
  );
}
