import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AccountKind } from "@/lib/domain/account";
import type { NewCapacityListing } from "@/lib/domain/capacity";
import type { NewShipment } from "@/lib/domain/shipment";
import { readSupabaseEnv } from "@/lib/db/supabase/env";
import { listingRow, shipmentRow } from "./rows";

// Hosted checks must not pass vacuously: missing credentials fail the run here.
const env = readSupabaseEnv();
const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

const createdAccounts: string[] = [];
const createdUsers: string[] = [];

export function serviceClient(): SupabaseClient {
  return createClient(env.url, env.serviceRoleKey, noSession);
}

export function anonClient(): SupabaseClient {
  return createClient(env.url, env.anonKey, noSession);
}

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error || result.data === null) throw new Error(`${what}: ${result.error?.message ?? "no data"}`);
  return result.data;
}

/** Account created directly with the service role (no user), for RPC contract tests. */
export async function insertAccount(kind: AccountKind): Promise<string> {
  const row = { kind, shipper_type: kind === "shipper" ? "business" : null, name: `AutoShip test ${kind}` };
  const data = must(await serviceClient().from("accounts").insert(row).select("id").single(), "insert account");
  createdAccounts.push(data.id);
  return data.id;
}

export async function insertShipment(input: NewShipment, accountId: string, client = serviceClient()) {
  return must(await client.from("shipments").insert(shipmentRow(input, accountId)).select("id").single(), "insert shipment").id as string;
}

export async function insertListing(input: NewCapacityListing, accountId: string, client = serviceClient()) {
  return must(await client.from("capacity_listings").insert(listingRow(input, accountId)).select("id").single(), "insert listing").id as string;
}

export type TestUser = { userId: string; accountId: string; client: SupabaseClient };

/** Creates a confirmed throwaway auth user, signs in, and creates its account via `create_account`. */
export async function createSignedInAccount(kind: AccountKind): Promise<TestUser> {
  const email = `autoship-test-${crypto.randomUUID()}@example.com`;
  const password = `${crypto.randomUUID()}Aa1!`;
  const created = must(
    await serviceClient().auth.admin.createUser({ email, password, email_confirm: true }),
    "create test user",
  );
  createdUsers.push(created.user.id);

  const client = anonClient();
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw new Error(`sign in: ${signIn.error.message}`);

  const accountId = must(
    await client.rpc("create_account", {
      p_kind: kind,
      p_shipper_type: kind === "shipper" ? "individual" : null,
      p_name: `AutoShip test ${kind}`,
    }),
    "create_account",
  ) as string;
  createdAccounts.push(accountId);
  return { userId: created.user.id, accountId, client };
}

/** Removes everything this run created; account deletes cascade to their records. */
export async function cleanupTestData(): Promise<void> {
  const admin = serviceClient();
  if (createdAccounts.length > 0) {
    const { error } = await admin.from("accounts").delete().in("id", createdAccounts.splice(0));
    if (error) throw new Error(`cleanup accounts: ${error.message}`);
  }
  for (const id of createdUsers.splice(0)) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error(`cleanup user ${id}: ${error.message}`);
  }
}
