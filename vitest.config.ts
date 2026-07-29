import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    exclude: [
      "**/*.spec.ts",
      "src/lib/work-management/tests/**",
      "src/lib/documents/**",
      "src/lib/notifications/**",
      "src/lib/reports/**",
      "scripts/**",
      "tests/**",
      "node_modules/**",
      "dist/**",
    ],
  },
});
