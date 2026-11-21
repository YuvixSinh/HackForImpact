"use client";

import { useActionState } from "react";
import { signUpAction } from "@/app/actions/auth";
import type { SignupRole } from "@/lib/auth/roles";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/validation";
import { FormError, FormField, SubmitButton } from "./form-field";
import { ROLE_COPY } from "./role-copy";

export function SignUpForm({ role }: { role: SignupRole }) {
  const [state, action, pending] = useActionState(signUpAction, undefined);
  return (
    <form action={action} noValidate className="space-y-4">
      <input type="hidden" name="role" value={role} />
      <FormError message={state?.error} />
      <FormField
        name="accountName"
        label={ROLE_COPY[role].nameLabel}
        autoComplete={role === "individual-shipper" ? "name" : "organization"}
        defaultValue={state?.values?.accountName}
        error={state?.fieldErrors?.accountName}
      />
      <FormField name="email" label="Email" type="email" autoComplete="email" defaultValue={state?.values?.email} error={state?.fieldErrors?.email} />
      <FormField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        error={state?.fieldErrors?.password}
      />
      <SubmitButton pending={pending}>Create {ROLE_COPY[role].title.toLowerCase()} account</SubmitButton>
    </form>
  );
}
