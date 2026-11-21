"use server";

import { revalidatePath } from "next/cache";
import type { ListingFieldErrors } from "@/lib/providers/listing-validation";
import { createListing, setListingStatus, updateListing } from "@/lib/providers/service";
import { getAppContext } from "@/lib/server/app-context";
import { requireDashboardViewer } from "@/lib/server/session";

export type ListingFormState =
  | { ok: true; message: string }
  | { ok: false; error: string; fieldErrors?: ListingFieldErrors; values?: Record<string, string> }
  | undefined;

/** Echoes submitted text back so a rejected form keeps what the provider typed. */
const submitted = (form: FormData) =>
  Object.fromEntries([...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"));

/** The provider's own account; never taken from the form. */
async function providerContext() {
  const viewer = await requireDashboardViewer("provider");
  return { accountId: viewer.account.id };
}

export async function createListingAction(_previous: ListingFormState, form: FormData): Promise<ListingFormState> {
  const ctx = await providerContext();
  const result = await createListing(getAppContext().repos, ctx, form);
  if (!result.ok) return { ok: false, error: result.error, fieldErrors: result.fieldErrors, values: submitted(form) };
  revalidatePath("/provider");
  return { ok: true, message: `Listing ${result.listing.origin} → ${result.listing.destination} published.` };
}

export async function updateListingAction(_previous: ListingFormState, form: FormData): Promise<ListingFormState> {
  const ctx = await providerContext();
  const id = form.get("listingId");
  if (typeof id !== "string" || !id) return { ok: false, error: "That listing was not found on your account." };
  const result = await updateListing(getAppContext().repos, ctx, id, form);
  if (!result.ok) return { ok: false, error: result.error, fieldErrors: result.fieldErrors, values: submitted(form) };
  revalidatePath("/provider");
  return { ok: true, message: "Listing updated." };
}

/** Pause/resume control: a plain form action. */
export async function setListingStatusAction(form: FormData): Promise<void> {
  const ctx = await providerContext();
  const id = form.get("listingId");
  const status = form.get("status");
  if (typeof id !== "string" || typeof status !== "string") return;
  await setListingStatus(getAppContext().repos, ctx, id, status);
  revalidatePath("/provider");
}
