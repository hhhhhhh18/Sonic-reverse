"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";
import type { Profile } from "@/lib/auth/types";
import { FormBanner, SubmitButton, TextField } from "./fields";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(updateProfileAction, initialFormState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  return (
    <form action={formAction} noValidate className="space-y-4">
      {state.status === "error" && state.message ? <FormBanner kind="error">{state.message}</FormBanner> : null}
      {state.status === "success" ? <FormBanner kind="success">{state.message}</FormBanner> : null}
      <TextField label="Display name" name="displayName" required maxLength={50} defaultValue={v?.displayName ?? profile.display_name ?? ""} error={errors.displayName} />
      <TextField
        label="Username"
        name="username"
        required
        maxLength={20}
        autoComplete="username"
        defaultValue={v?.username ?? profile.username}
        error={errors.username}
        hint="Lowercase letters, numbers and underscores. Your profile is public."
      />
      <TextField label="Bio" name="bio" multiline maxLength={280} defaultValue={v?.bio ?? profile.bio ?? ""} error={errors.bio} hint="Up to 280 characters." />
      <TextField
        label="Profile picture link"
        name="avatarUrl"
        type="url"
        maxLength={500}
        placeholder="https://…"
        defaultValue={v?.avatarUrl ?? profile.avatar_url ?? ""}
        error={errors.avatarUrl}
        hint="Optional. A full https:// image link."
      />
      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}
