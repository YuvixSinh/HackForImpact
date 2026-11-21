import { describe, expect, it } from "vitest";
import { serviceClient } from "../integration/hosted/support/supabase";

const TABLES = [
  "accounts",
  "account_members",
  "shipments",
  "capacity_listings",
  "emissions_factors",
  "approval_policies",
  "match_options",
  "approval_requests",
  "bookings",
  "tracking_events",
  "audit_events",
];
const SERVICE_ONLY_RPCS = ["reserve_capacity", "confirm_booking", "release_reservation", "autoship_schema_report"];

type Report = {
  tables: Record<string, { rls: boolean; policies: number; service_role_can_select: boolean; authenticated_can_select: boolean }>;
  functions: Record<string, { security_definer: boolean; anon_can_execute: boolean; authenticated_can_execute: boolean; service_role_can_execute: boolean }>;
  bookings_one_active_index: boolean;
};

/** `npm run db:verify`: checks the migrated schema on the linked hosted project. */
describe("hosted schema", () => {
  let report: Report;

  it("is migrated and reports its schema to the service role", async () => {
    const { data, error } = await serviceClient().rpc("autoship_schema_report");
    expect(error, error?.message).toBeNull();
    report = data as Report;
  });

  it("has every table with row-level security enabled", () => {
    for (const table of TABLES) {
      expect(report.tables[table], `${table} missing`).toBeDefined();
      expect(report.tables[table].rls, `${table} RLS`).toBe(true);
    }
    for (const [table, info] of Object.entries(report.tables)) {
      expect(info.rls, `unexpected table without RLS: ${table}`).toBe(true);
      expect(info.service_role_can_select, `${table} service_role access`).toBe(true);
      expect(info.authenticated_can_select, `${table} authenticated access`).toBe(true);
    }
  });

  it("has policies on every table that signed-in users read", () => {
    for (const table of TABLES) expect(report.tables[table].policies, `${table} policies`).toBeGreaterThan(0);
  });

  it("keeps reservation RPCs executable by the service role only", () => {
    for (const fn of SERVICE_ONLY_RPCS) {
      expect(report.functions[fn], `${fn} missing`).toMatchObject({
        security_definer: true,
        anon_can_execute: false,
        authenticated_can_execute: false,
        service_role_can_execute: true,
      });
    }
    expect(report.functions.create_account).toMatchObject({ anon_can_execute: false, authenticated_can_execute: true });
  });

  it("enforces one active booking per shipment in the database", () => {
    expect(report.bookings_one_active_index).toBe(true);
  });

  it("matches the in-memory emissions factors", async () => {
    const { PROTOTYPE_EMISSIONS_FACTORS } = await import("@/lib/domain/emissions");
    const { data, error } = await serviceClient().from("emissions_factors").select("*");
    expect(error).toBeNull();
    const byMode = (a: { mode: string }, b: { mode: string }) => a.mode.localeCompare(b.mode);
    const rows = (data ?? [])
      .map((r) => ({
        mode: r.mode,
        kgCo2PerTonneKm: Number(r.kg_co2_per_tonne_km),
        dedicatedVehicleKgCo2PerKm: Number(r.dedicated_vehicle_kg_co2_per_km),
        source: r.source,
      }))
      .sort(byMode);
    expect(rows).toEqual([...PROTOTYPE_EMISSIONS_FACTORS].sort(byMode));
  });
});
