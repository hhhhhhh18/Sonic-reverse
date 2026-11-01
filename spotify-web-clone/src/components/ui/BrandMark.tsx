/**
 * PLACEHOLDER logo. This is an original mark (a circle with equalizer bars),
 * not Spotify's trademarked logo. Replace this one file to rebrand.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="16" fill="#ffffff" />
      <rect x="8" y="14" width="3.2" height="8" rx="1.6" fill="#000" />
      <rect x="12.9" y="9" width="3.2" height="14" rx="1.6" fill="#000" />
      <rect x="17.8" y="12" width="3.2" height="10" rx="1.6" fill="#000" />
      <rect x="22.7" y="16" width="3.2" height="6" rx="1.6" fill="#000" />
    </svg>
  );
}
