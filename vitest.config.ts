import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      ".next/**",
      "packages/db/migrations/**",
    ],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["app/api/src/**", "packages/db/**", "apps/web/src/**"],
      exclude: ["**/node_modules/**", "**/test-utils/**", "**/*.config.*"],
    },
  },
  resolve: {
    alias: {
      "@repo/db": path.resolve(__dirname, "packages/db/src"),
      "@repo/types": path.resolve(__dirname, "packages/types/src"),
    },
  },
});
