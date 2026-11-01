"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useNotice } from "@/components/shell/NoticeProvider";

interface StubLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "onClick" | "href"> {
  /** Realistic destination path (kept for fidelity; navigation is intercepted). */
  href: string;
  /** Name of the unbuilt feature, shown in the toast. */
  feature: string;
  children: ReactNode;
}

/**
 * A link to a page this demo doesn't implement. It keeps a real-looking href
 * but shows an honest "not implemented" notice instead of navigating to a 404.
 */
export function StubLink({ href, feature, children, ...rest }: StubLinkProps) {
  const { notImplemented } = useNotice();
  return (
    <a
      {...rest}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        notImplemented(feature);
      }}
    >
      {children}
    </a>
  );
}
