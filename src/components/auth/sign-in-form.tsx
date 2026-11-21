"use client";

import { useActionState } from "react";
import { signInAction } from "@/app/actions/auth";
import { FormError, FormField, SubmitButton } from "./form-field";

export function SignInForm() {
  const [state, action, pending] = useActionState(signInAction, undefined);
  return (
    <form action={action} noValidate className="space-y-4">
      <FormError message={state?.error} />
      <FormField name="email" label="Email" type="email" autoComplete="email" defaultValue={state?.values?.email} />
      <FormField name="password" label="Password" type="password" autoComplete="current-password" />
      <SubmitButton pending={pending}>Sign in</SubmitButton>
    </form>
  );
}
