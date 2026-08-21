import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Resolves the `@/…` alias from tsconfig, so tests import modules by the same
  // path the app does and a moved file breaks both at once.
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: { include: ["src/core/**"], reporter: ["text-summary"] },
  },
});
