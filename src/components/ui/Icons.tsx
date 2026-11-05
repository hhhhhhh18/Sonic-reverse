import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** Simple original line icons (24x24 grid). Decorative by default. */
function Svg({ children, fill = "none", ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill={fill}
      stroke={fill === "none" ? "currentColor" : "none"}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></Svg>
);
export const SearchIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" /></Svg>
);
export const CloseIcon = (p: IconProps) => (
  <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>
);
export const PlusIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);
export const PlayIcon = (p: IconProps) => (
  <Svg fill="currentColor" {...p}>
    <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.5-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z" />
  </Svg>
);
export const PauseIcon = (p: IconProps) => (
  <Svg fill="currentColor" {...p}>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </Svg>
);
export const PrevIcon = (p: IconProps) => (
  <Svg fill="currentColor" {...p}>
    <rect x="5" y="5" width="2.5" height="14" rx="1" />
    <path d="M19 5.5v13L9 12z" />
  </Svg>
);
export const NextIcon = (p: IconProps) => (
  <Svg fill="currentColor" {...p}>
    <rect x="16.5" y="5" width="2.5" height="14" rx="1" />
    <path d="M5 5.5v13L15 12z" />
  </Svg>
);
export const ShuffleIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3" />
  </Svg>
);
export const RepeatIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 11V9a3 3 0 0 1 3-3h11l-3-3M20 13v2a3 3 0 0 1-3 3H6l3 3" /></Svg>
);
export const VolumeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9v6h4l5 4V5L8 9z" />
    <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" />
  </Svg>
);
export const MuteIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9v6h4l5 4V5L8 9z" />
    <path d="M16 9l5 6M21 9l-5 6" />
  </Svg>
);
export const HeartIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></Svg>
);
export const MoreIcon = (p: IconProps) => (
  <Svg fill="currentColor" {...p}>
    <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
  </Svg>
);
export const DownloadIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></Svg>
);
export const GlobeIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </Svg>
);
export const LibraryIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 4v16M10 4v16M15 5l4 15" /></Svg>
);
export const BrowseIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></Svg>
);
export const ExpandIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 14v6h6M20 10V4h-6M4 20l7-7M20 4l-7 7" /></Svg>
);
export const MenuIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Svg>
);
