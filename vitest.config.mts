import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Scoring tests share one sandbox season in the real Supabase project;
    // run them serially so weeks don't interleave.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 40_000,
  },
});
