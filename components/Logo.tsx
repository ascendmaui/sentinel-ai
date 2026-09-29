type MarkProps = {
  size?: number;
  id: string;
  className?: string;
  title?: string;
};

/** Sentinel mark: shield with a watchful eye / aperture. Uses AO theme mark tokens. */
export const SHIELD_PATH =
  "M16 2.5 27.5 7.2V15.5c0 7.2-4.8 12.4-11.5 14.8C9.3 27.9 4.5 22.7 4.5 15.5V7.2Z";

export function Mark({ size = 32, id, className, title }: MarkProps) {
  const g = `sa-gold-${id}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className ? `ao-mark ${className}` : "ao-mark"}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={g} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" className="ao-mark-hi" />
          <stop offset="0.5" className="ao-mark-mid" />
          <stop offset="1" className="ao-mark-lo" />
        </linearGradient>
      </defs>
      <path d={SHIELD_PATH} fill={`url(#${g})`} />
      {/* Eye / aperture cut */}
      <ellipse cx="16" cy="15.2" rx="5.2" ry="3.4" className="ao-mark-keyhole" fill="var(--ao-mark-keyhole)" />
      <circle cx="16" cy="15.2" r="1.7" className="ao-mark-jewel" />
    </svg>
  );
}

export function Wordmark({ id, size = 28 }: { id: string; size?: number }) {
  return (
    <span className="wordmark">
      <Mark id={id} size={size} />
      <span className="wordmark-text">
        Sentinel<span>AI</span>
      </span>
    </span>
  );
}
