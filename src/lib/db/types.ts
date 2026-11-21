import type { Id } from "@/lib/domain/common";

/**
 * The account a request acts for, resolved server-side from the signed-in user (task 3).
 * Repositories scope every read and write to it, mirroring the database's row-level security:
 * records belonging to another account behave as if they do not exist.
 */
export type AccessContext = { accountId: Id };

/** Thrown when an operation targets a record the context cannot see, or the wrong account kind. */
export class AccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessError";
  }
}
