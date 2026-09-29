const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

export type IconName = "scan" | "shield" | "fix" | "users" | "list" | "mail" | "check" | "target";

export function Icon({ name }: { name: IconName }) {
  switch (name) {
    case "scan":
      return (
        <svg {...base}>
          <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M4 12h16" />
        </svg>
      );
    case "shield":
      return (
        <svg {...base}>
          <path d="M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6z" />
          <path d="M9 12l2.2 2.2L15.5 10" />
        </svg>
      );
    case "fix":
      return (
        <svg {...base}>
          <path d="M12 3v3M12 18v3M5 7l2 2M17 15l2 2M3 12h3M18 12h3M5 17l2-2M17 9l2-2" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      );
    case "users":
      return (
        <svg {...base}>
          <path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20M9.5 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM20 20v-1.2a3 3 0 0 0-2.2-2.9M15.5 4.6a3 3 0 0 1 0 5.8" />
        </svg>
      );
    case "list":
      return (
        <svg {...base}>
          <path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />
        </svg>
      );
    case "mail":
      return (
        <svg {...base}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="M4 7.5 12 13l8-5.5" />
        </svg>
      );
    case "check":
      return (
        <svg {...base}>
          <path d="M5 12.5 9.5 17 19 7.5" />
        </svg>
      );
    case "target":
      return (
        <svg {...base}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      );
  }
}
