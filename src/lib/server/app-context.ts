import "server-only";
import { randomBytes } from "node:crypto";
import { createDemoUserStore, type DemoUserStore } from "@/lib/auth/demo-users";
import { createAuthService, type AuthService } from "@/lib/auth/service";
import { createInMemoryRepositories } from "@/lib/db/memory";
import type { Repositories } from "@/lib/db/repositories";

export type AppContext = { repos: Repositories; users: DemoUserStore; auth: AuthService };

/**
 * Process-wide services. Data and demo users live in memory (ADR 0002 / ADR 0004): they reset
 * when the server restarts and are not shared between serverless instances. Kept on globalThis
 * so development hot reloads do not wipe them.
 */
const holder = globalThis as typeof globalThis & { __autoshipContext?: AppContext };

function sessionSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET (at least 32 characters) is required in production.");
  }
  // Development: a per-process secret, so sessions end when the dev server restarts.
  return randomBytes(32).toString("hex");
}

export function getAppContext(): AppContext {
  if (!holder.__autoshipContext) {
    const repos = createInMemoryRepositories();
    const users = createDemoUserStore();
    holder.__autoshipContext = { repos, users, auth: createAuthService({ repos, users, secret: sessionSecret() }) };
  }
  return holder.__autoshipContext;
}
