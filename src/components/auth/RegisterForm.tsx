"use client";

import { useActionState } from "react";
import { registerAction } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";
import { FormBanner, SubmitButton, TextField } from "./fields";

export function RegisterForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(registerAction, initialFormState);
  const errors = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <div className="space-y-4">
        <FormBanner kind="success">{state.message}</FormBanner>
        {state.values?.email ? <p className="text-sm text-subtle">We sent it to {state.values.email}.</p> : null}
      </div>
    );
  }
  return (
    <form action={formAction} noValidate className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state.status === "error" && state.message ? <FormBanner kind="error">{state.message}</FormBanner> : null}
      <TextField label="Email address" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} error={errors.email} />
      <TextField
        label="Username"
        name="username"
        autoComplete="username"
        required
        maxLength={20}
        defaultValue={state.values?.username}
        error={errors.username}
        hint="3-20 characters: lowercase letters, numbers and underscores."
      />
      <TextField
        label="Display name (optional)"
        name="displayName"
        autoComplete="nickname"
        maxLength={50}
        defaultValue={state.values?.displayName}
        error={errors.displayName}
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={errors.password}
        hint="At least 8 characters."
      />
      <SubmitButton pendingText="Creating your account…">Sign up</SubmitButton>
    </form>
  );
}
