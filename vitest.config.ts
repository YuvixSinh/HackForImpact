import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

// Hosted checks read Supabase credentials from .env.local (never committed). Variables
// already set in the shell take precedence; a missing file is fine for unit tests.
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig(() => {
  const hosted = {
    environment: "node" as const,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // One file at a time keeps hosted test data and auth rate limits predictable.
    fileParallelism: false,
  };

  return {
    plugins: [react()],
    resolve: { alias },
    test: {
      projects: [
        {
          extends: true,
          test: { name: "unit", environment: "jsdom", include: ["tests/unit/**/*.test.{ts,tsx}"] },
        },
        {
          extends: true,
          test: { name: "integration", include: ["tests/integration/**/*.test.ts"], ...hosted },
        },
        {
          extends: true,
          test: { name: "db", include: ["tests/db/**/*.test.ts"], ...hosted },
        },
      ],
    },
  };
});
