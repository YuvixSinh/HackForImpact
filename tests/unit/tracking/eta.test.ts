import { describe, expect, it } from "vitest";
import { parseTrackingEta } from "@/lib/tracking/eta";

describe("parseTrackingEta", () => {
  it("reads a zone-less datetime-local value as UTC, like every other form", () => {
    expect(parseTrackingEta("2030-01-01T10:00")).toBe("2030-01-01T10:00:00.000Z");
  });

  it("keeps an explicit zone and rejects invalid or empty input", () => {
    expect(parseTrackingEta("2030-01-01T10:00+02:00")).toBe("2030-01-01T08:00:00.000Z");
    expect(parseTrackingEta("not a date")).toBeNull();
    expect(parseTrackingEta("")).toBeNull();
  });
});
