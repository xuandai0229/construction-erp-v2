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
    include: ["src/**/*.test.ts", "scripts/qa/**/*.test.ts"],
    exclude: [
      "**/*.spec.ts",
      "src/lib/documents/**",
      "src/lib/notifications/**",
      "src/lib/reports/**",
      "tests/**",
      "node_modules/**",
      "dist/**",
    ],
  },
});
