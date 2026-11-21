import "server-only";
import { NextResponse } from "next/server";

const noStore = { "Cache-Control": "no-store" };

export const unauthorised = () => NextResponse.json({ error: "unauthorised" }, { status: 401, headers: noStore });

/** Also used for records owned by other accounts, so their existence is not revealed. */
export const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });

export const ok = (body: unknown) => NextResponse.json(body, { headers: noStore });
