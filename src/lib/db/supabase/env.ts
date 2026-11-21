/**
 * Supabase settings. Only the URL and anon (publishable) key may reach the browser;
 * the service-role key is server-only and must never use a NEXT_PUBLIC_ prefix.
 */
export type SupabaseEnv = { url: string; anonKey: string; serviceRoleKey: string };

const NAMES = {
  url: "NEXT_PUBLIC_SUPABASE_URL",
  anonKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  serviceRoleKey: "SUPABASE_SERVICE_ROLE_KEY",
} as const;

/** True when all three variables are set; the app falls back to in-memory repositories otherwise. */
export function hasSupabaseEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return Object.values(NAMES).every((name) => Boolean(env[name]));
}

export function readSupabaseEnv(env: NodeJS.ProcessEnv = process.env): SupabaseEnv {
  const missing = Object.values(NAMES).filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing Supabase environment variables: ${missing.join(", ")}. See .env.example.`);
  }
  return {
    url: env[NAMES.url] as string,
    anonKey: env[NAMES.anonKey] as string,
    serviceRoleKey: env[NAMES.serviceRoleKey] as string,
  };
}
