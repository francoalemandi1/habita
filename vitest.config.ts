import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    // Exact-match rules: a plain "@habita/domain" key would also prefix-match
    // "@habita/domain/money-balances" and resolve it to "index.ts/money-balances".
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      {
        find: /^@habita\/(contracts|api-client|domain|design-tokens|prices)$/,
        replacement: path.resolve(__dirname, "./packages/$1/src/index.ts"),
      },
      {
        find: /^@habita\/(contracts|api-client|domain|design-tokens|prices)\/(.+)$/,
        replacement: path.resolve(__dirname, "./packages/$1/src/$2.ts"),
      },
    ],
  },
});
