"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";

const INPUT =
  "h-12 w-full rounded-md border border-white/25 bg-panel px-3 text-base text-white placeholder:text-subtle hover:border-white/50 focus:border-white focus:outline-none focus:ring-1 focus:ring-white aria-[invalid=true]:border-[#f15e6c]";

export function TextField({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
  error,
  hint,
  required,
  maxLength,
  placeholder,
  multiline,
}: {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "url";
  autoComplete?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  multiline?: boolean;
}) {
  const id = `field-${name}`;
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  const shared = {
    id,
    name,
    defaultValue,
    required,
    maxLength,
    placeholder,
    autoComplete,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  } as const;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} rows={3} className={cn(INPUT, "h-auto py-2.5")} />
      ) : (
        <input {...shared} type={type} className={INPUT} />
      )}
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-subtle">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-[#f15e6c]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A message above or below a form. Errors are announced immediately; success politely. */
export function FormBanner({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md px-3 py-2.5 text-sm font-medium",
        kind === "error" ? "bg-[#f15e6c]/15 text-[#ff9aa4]" : "bg-accent/15 text-accent",
      )}
    >
      {children}
    </p>
  );
}

/** Disables itself and shows progress while its form's action is running. */
export function SubmitButton({
  children,
  pendingText = "Please wait…",
  variant = "primary",
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "outline" | "light";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        "h-12 w-full rounded-full text-base font-bold transition hover:scale-[1.02] disabled:cursor-wait disabled:opacity-60 disabled:hover:scale-100",
        variant === "primary" && "bg-accent text-black hover:bg-accent-hover",
        variant === "outline" && "border border-white/40 bg-transparent text-white hover:border-white",
        variant === "light" && "bg-white text-black",
      )}
    >
      {pending ? pendingText : children}
    </button>
  );
}
