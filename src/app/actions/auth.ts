"use server";

import { redirect } from "next/navigation";
import { dashboardPath, isSignupRole } from "@/lib/auth/roles";
import type { AuthFailure } from "@/lib/auth/service";
import type { FieldErrors } from "@/lib/auth/validation";
import { getAppContext } from "@/lib/server/app-context";
import { clearSessionCookie, setSessionCookie } from "@/lib/server/session";

export type AuthFormState =
  | { error?: string; fieldErrors?: FieldErrors; values?: { email?: string; accountName?: string } }
  | undefined;

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};

const MESSAGES: Record<AuthFailure["error"], string> = {
  invalid_input: "Check the highlighted fields.",
  email_taken: "An account with this email already exists. Sign in instead.",
  invalid_credentials: "Email or password is incorrect.",
};

export async function signUpAction(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  const role = form.get("role");
  if (!isSignupRole(role)) return { error: "Choose an account type." };
  const input = { role, accountName: text(form, "accountName"), email: text(form, "email"), password: text(form, "password") };
  const result = await getAppContext().auth.signUp(input);
  if (!result.ok) {
    return {
      error: MESSAGES[result.error],
      fieldErrors: result.error === "invalid_input" ? result.fieldErrors : undefined,
      values: { email: input.email, accountName: input.accountName },
    };
  }
  await setSessionCookie(result.token);
  redirect(dashboardPath(result.viewer.account));
}

export async function signInAction(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = text(form, "email");
  const result = await getAppContext().auth.signIn({ email, password: text(form, "password") });
  if (!result.ok) return { error: MESSAGES[result.error], values: { email } };
  await setSessionCookie(result.token);
  redirect(dashboardPath(result.viewer.account));
}

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}
