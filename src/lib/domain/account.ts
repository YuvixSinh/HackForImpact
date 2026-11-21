import type { Id, IsoDateTime } from "./common";

export type AccountKind = "shipper" | "provider";

/** Shippers register as a business or an individual; providers have no shipper type. */
export type ShipperType = "business" | "individual";

/** The organisation boundary: every account-scoped record carries an account id. */
export type Account = {
  id: Id;
  kind: AccountKind;
  shipperType: ShipperType | null;
  name: string;
  createdAt: IsoDateTime;
};

export type AccountMemberRole = "owner" | "member";

/** Links an authenticated user (Supabase `auth.users.id`) to an account. */
export type AccountMember = {
  accountId: Id;
  userId: Id;
  role: AccountMemberRole;
};

export type NewAccount = {
  kind: AccountKind;
  shipperType: ShipperType | null;
  name: string;
  ownerUserId: Id;
};
