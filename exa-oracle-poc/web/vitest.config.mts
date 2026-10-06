import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
  test: {
    // Default stays "node" for the existing lib/*.ts and app/api/**/route.ts
    // unit tests. Component tests (React Testing Library) need a DOM, so
    // those files opt into jsdom individually via a
    // `// @vitest-environment jsdom` docblock at the top of the test file —
    // Vitest 4 dropped the old `environmentMatchGlobs` config option that
    // used to do this repo-wide by glob, so this is per-file instead.
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
