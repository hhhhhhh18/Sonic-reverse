"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";
import { FormBanner, SubmitButton, TextField } from "./fields";

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [state, formAction] = useActionState(loginAction, initialFormState);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={formAction} noValidate className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state.status === "error" && state.message ? <FormBanner kind="error">{state.message}</FormBanner> : null}
      {state.status === "idle" && initialError ? <FormBanner kind="error">{initialError}</FormBanner> : null}
      <TextField label="Email address" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} error={errors.email} />
      <TextField label="Password" name="password" type="password" autoComplete="current-password" required error={errors.password} />
      <SubmitButton pendingText="Logging in…">Log in</SubmitButton>
    </form>
  );
}
