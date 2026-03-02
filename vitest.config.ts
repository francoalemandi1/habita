import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@habita/contracts": path.resolve(__dirname, "./packages/contracts/src/index.ts"),
      "@habita/api-client": path.resolve(__dirname, "./packages/api-client/src/index.ts"),
      "@habita/domain": path.resolve(__dirname, "./packages/domain/src/index.ts"),
      "@habita/design-tokens": path.resolve(__dirname, "./packages/design-tokens/src/index.ts"),
    },
  },
});
