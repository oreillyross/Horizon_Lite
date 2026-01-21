import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.cache/**",
      "**/.bun/**",
      ".next/**",
      "packages/db/migrations/**",
    ],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["app/api/src/**", "packages/db/**", "apps/web/src/**", "client/src/**"],
      exclude: ["**/node_modules/**", "**/test-utils/**", "**/*.config.*"],
    },
  },
  resolve: {
    alias: {
      "@repo/db": path.resolve(__dirname, "packages/db/src"),
      "@repo/types": path.resolve(__dirname, "packages/types/src"),
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
