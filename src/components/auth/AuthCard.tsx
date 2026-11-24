import type { ReactNode } from "react";

/** Centered card used by the login, register and account pages. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md py-4 sm:py-10">
      <div className="space-y-6 rounded-lg bg-elevated p-6 sm:p-8">
        <div>
          <h2 className="text-3xl font-bold">{title}</h2>
          {subtitle ? <p className="mt-2 text-subtle">{subtitle}</p> : null}
        </div>
        {children}
      </div>
      {footer ? <p className="mt-6 text-center text-subtle">{footer}</p> : null}
    </div>
  );
}
