import { cn } from "@/lib/cn";

/** FNV-1a, so the same seed always yields the same artwork (SSR-safe). */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Original generated placeholder artwork: a gradient with one of four
 * geometric patterns, derived from `seed`. No external images are used.
 */
export function Cover({
  seed,
  round = false,
  className,
}: {
  seed: string;
  round?: boolean;
  className?: string;
}) {
  const h = hash(seed);
  const h1 = h % 360;
  const h2 = (h1 + 40 + ((h >>> 8) % 120)) % 360;
  const h3 = (h1 + 180) % 360;
  const pattern = (h >>> 16) % 4;
  const stroke = `hsl(${h3} 70% 78% / 0.35)`;
  const fill = `hsl(${h3} 70% 78% / 0.22)`;

  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden", round ? "rounded-full" : "rounded-md", className)}
      style={{ background: `linear-gradient(135deg, hsl(${h1} 52% 40%), hsl(${h2} 58% 22%))` }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        focusable="false"
      >
        {pattern === 0 && (
          <g fill="none" stroke={stroke} strokeWidth="3">
            <circle cx="62" cy="42" r="12" />
            <circle cx="62" cy="42" r="26" />
            <circle cx="62" cy="42" r="40" />
          </g>
        )}
        {pattern === 1 && (
          <g stroke={stroke} strokeWidth="5">
            <path d="M-10 70L70 -10M10 90L90 10M30 110L110 30M-30 50L50 -30" />
          </g>
        )}
        {pattern === 2 && (
          <g fill={fill}>
            <path d="M10 90L45 25L80 90z" />
            <path d="M45 90L72 42L99 90z" fill={stroke} />
          </g>
        )}
        {pattern === 3 && (
          <g fill="none" stroke={stroke} strokeWidth="4">
            <path d="M0 70a50 50 0 0 1 100 0" />
            <path d="M14 70a36 36 0 0 1 72 0" />
            <path d="M28 70a22 22 0 0 1 44 0" />
          </g>
        )}
      </svg>
    </div>
  );
}
