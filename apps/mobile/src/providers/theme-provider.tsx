import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getThemeColors, createTypography } from "@/theme";

import type { ReactNode } from "react";
import type { ThemeMode, ResolvedThemeMode, ThemeColors } from "@/theme";

const STORAGE_KEY = "habita_theme_mode";

interface ThemeContextValue {
  /** User's preference: light, dark, or system. */
  mode: ThemeMode;
  /** Resolved mode after applying system preference. */
  resolvedMode: ResolvedThemeMode;
  /** Theme-aware color tokens. */
  colors: ThemeColors;
  /** Theme-aware typography styles. */
  typography: ReturnType<typeof createTypography>;
  /** Update the user's theme preference. */
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "system") {
          setModeState(stored);
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const resolvedMode: ResolvedThemeMode = useMemo(() => {
    if (mode === "system") {
      return systemScheme === "dark" ? "dark" : "light";
    }
    return mode;
  }, [mode, systemScheme]);

  const colors = useMemo(() => getThemeColors(resolvedMode), [resolvedMode]);
  const typographyValue = useMemo(() => createTypography(colors), [colors]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedMode, colors, typography: typographyValue, setMode }),
    [mode, resolvedMode, colors, typographyValue, setMode],
  );

  // Don't render children until we've loaded the persisted preference
  // to avoid a flash of the wrong theme
  if (!isLoaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Access the current theme. Throws if used outside ThemeProvider. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

/** Shorthand to get just the theme-aware colors. */
export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}
