import type { ApprovalThresholds } from "@/lib/domain/policy";

export type ThresholdForm = { maxAutoPrice: string; declaredValueThreshold: string; minDeadlineMarginHours: string };
export type ThresholdErrors = Partial<Record<keyof ThresholdForm, string>>;

const LIMITS = { maxAutoPrice: 1_000_000, declaredValueThreshold: 10_000_000, minDeadlineMarginHours: 720 };

function number(raw: string, max: number): number | string {
  if (raw.trim() === "") return "Enter a value.";
  const value = Number(raw);
  if (!Number.isFinite(value)) return "Enter a number.";
  if (value < 0) return "Must be zero or more.";
  if (value > max) return `Must be ${max.toLocaleString("en-GB")} or less.`;
  return value;
}

/** Validates the shipper's settings form (pounds and hours) into stored thresholds (pence and hours). */
export function parseThresholds(
  form: ThresholdForm,
): { ok: true; thresholds: ApprovalThresholds } | { ok: false; errors: ThresholdErrors } {
  const price = number(form.maxAutoPrice, LIMITS.maxAutoPrice);
  const value = number(form.declaredValueThreshold, LIMITS.declaredValueThreshold);
  const margin = number(form.minDeadlineMarginHours, LIMITS.minDeadlineMarginHours);
  const errors: ThresholdErrors = {};
  if (typeof price === "string") errors.maxAutoPrice = price;
  if (typeof value === "string") errors.declaredValueThreshold = value;
  if (typeof margin === "string") errors.minDeadlineMarginHours = margin;
  if (typeof price === "string" || typeof value === "string" || typeof margin === "string") return { ok: false, errors };
  return {
    ok: true,
    thresholds: {
      maxAutoPricePence: Math.round(price * 100),
      declaredValueThresholdPence: Math.round(value * 100),
      minDeadlineMarginHours: margin,
    },
  };
}
