import type { TierId } from "../lib/tiers";

/**
 * Rank emblems derived from the seraphim motif. Line art in currentColor so they follow the theme.
 * Seraphim: six wings and a halo. Cherubim: a many-eyed wheel with a pair of wings.
 * Thrones: a wheel within a wheel on a seat. Angels: a single small wing under a halo.
 */
export function TierEmblem({ id, size = 44 }: { id: TierId; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className: "tier-emblem",
  };
  switch (id) {
    case "seraphim":
      return (
        <svg {...common}>
          <ellipse cx="24" cy="6" rx="5" ry="1.7" />
          <circle cx="24" cy="12" r="2.4" />
          <path d="M24 15c2 4 3 9 3 14s-1 8-3 12c-2-4-3-7-3-12s1-10 3-14Z" />
          <path d="M21.5 15C15 14 9 10 4 4c7 1 13 4 17 8M21 21C14 20.5 8 18 2 13c7 0 14 2 19 6M21 27c-5 .6-10-.4-15-3 6-1 11-.4 15 1M21.5 33c-3 2-7 3-11 3 4-3 7-4.500 11-5" />
          <path d="M26.500 15C33 14 39 10 44 4c-7 1-13 4-17 8M27 21c7-.5 13-3 19-8-7 0-14 2-19 6M27 27c5 .6 10-.4 15-3-6-1-11-.4-15 1M26.500 33c3 2 7 3 11 3-4-3-7-4.500-11-5" />
          <circle cx="24" cy="24" r="1.6" fill="currentColor" />
        </svg>
      );
    case "cherubim":
      return (
        <svg {...common}>
          <circle cx="24" cy="26" r="10" />
          <circle cx="24" cy="26" r="4.500" />
          <circle cx="24" cy="26" r="1.300" fill="currentColor" />
          <circle cx="24" cy="16" r="1" fill="currentColor" />
          <circle cx="24" cy="36" r="1" fill="currentColor" />
          <circle cx="14" cy="26" r="1" fill="currentColor" />
          <circle cx="34" cy="26" r="1" fill="currentColor" />
          <path d="M14 22C10 20 6 16 3 10c6 1 10 3 12 6M34 22c4-2 8-6 11-12-6 1-10 3-12 6" />
          <path d="M14.500 30C10 31 6 30 3 27c5-1 8-1 11 0M33.500 30c4.500 1 8.500 0 11.500-3-5-1-8-1-11 0" />
        </svg>
      );
    case "thrones":
      return (
        <svg {...common}>
          <circle cx="24" cy="21" r="11" />
          <ellipse cx="24" cy="21" rx="4.500" ry="11" />
          <circle cx="24" cy="21" r="1.300" fill="currentColor" />
          <path d="M11 35h26M14 35v6M34 35v6M17 41h14" />
          <path d="M13 12 10 8M35 12l3-4" />
        </svg>
      );
    case "angels":
      return (
        <svg {...common}>
          <ellipse cx="24" cy="9" rx="5" ry="1.700" />
          <circle cx="24" cy="16" r="3" />
          <path d="M24 20v11" />
          <path d="M24 22C30 21 36 24 40 30c-6 0-11-1-16-4M24 27c4 .5 8 3 10 6-4 0-7-1-10-3" />
        </svg>
      );
  }
}
