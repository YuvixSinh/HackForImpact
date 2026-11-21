import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  // Next.js resolves `server-only` internally; tests run server modules directly.
  "server-only": fileURLToPath(new URL("./node_modules/next/dist/compiled/server-only/empty.js", import.meta.url)),
};

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
          // Local integration: route handlers + auth + in-memory repositories, no network.
          extends: true,
          test: {
            name: "app",
            environment: "node",
            include: ["tests/integration/app/**/*.test.ts"],
            env: { AUTH_SECRET: "local-integration-test-secret-0123456789" },
          },
        },
        {
          extends: true,
          test: { name: "integration", include: ["tests/integration/hosted/**/*.test.ts"], ...hosted },
        },
        {
          extends: true,
          test: { name: "db", include: ["tests/db/**/*.test.ts"], ...hosted },
        },
      ],
    },
  };
});
