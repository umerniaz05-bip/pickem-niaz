import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "server-only": r("./tests/stubs/server-only.js"),
      "@": r("./src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // Scoring/sync tests share one sandbox season in the real Supabase project;
    // run files serially so weeks don't interleave.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 40_000,
  },
});
