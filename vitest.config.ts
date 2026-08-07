import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.hr-qa.local" });
dotenv.config({ path: ".env" });

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
