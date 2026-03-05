import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["packages/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/*"],
              message: "Shared packages cannot import app-local alias @/*",
            },
            {
              group: ["next/*", "next"],
              message: "Shared packages cannot depend on Next.js runtime imports",
            },
            {
              group: ["react-native", "react-native/*"],
              message: "Shared packages must remain platform-agnostic",
            },
            {
              group: ["expo", "expo-*", "expo/*"],
              message: "Shared packages must remain platform-agnostic",
            },
          ],
        },
      ],
    },
  },
  // Prevent mobile from importing web-only modules
  {
    files: ["apps/mobile/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next/*", "next"],
              message: "Mobile cannot import Next.js modules",
            },
          ],
        },
      ],
      // React Native requires require() for static assets (images, fonts)
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Prevent web from importing mobile-only modules
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react-native", "react-native/*"],
              message: "Web cannot import React Native modules",
            },
            {
              group: ["expo", "expo-*", "expo/*"],
              message: "Web cannot import Expo modules",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
