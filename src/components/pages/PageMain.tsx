import type { ReactNode } from "react";

/**
 * The page's <main> landmark. It is the target of the skip link and is
 * labelled with the page title, as on the captured reference.
 */
export function PageMain({
  label,
  heading,
  children,
}: {
  label: string;
  /** Visually hidden <h1> for screen-reader users. */
  heading: string;
  children: ReactNode;
}) {
  return (
    <main id="main-view" tabIndex={-1} aria-label={label} className="px-4 pb-6 pt-6 outline-none sm:px-7 sm:pt-7">
      <h1 className="sr-only">{heading}</h1>
      {children}
    </main>
  );
}
