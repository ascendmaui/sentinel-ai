import { BRAND_NAME, BRAND_SUFFIX, BRAND_WORD } from "../lib/brand";

type MarkProps = { size?: number; id: string; className?: string; title?: string; square?: boolean };

/**
 * Seraphim Scan mark: six wings (three pairs) around a scan aperture with a scan bar and core.
 * Geometry is generated from brand/seraphim-scan/src/mark.py (1024 grid, 32 px module) so the
 * site, app icons and logo files share one shape. Text-free on purpose.
 */
export function Mark({ size = 32, id, className, title, square }: MarkProps) {
  const g = `ss-gold-${id}`;
  const c = `ss-core-${id}`;
  const vb = square ? "88 88 848 848" : "88 150 848 600";
  const h = square ? size : Math.round((size * 600) / 848);
  return (
    <svg
      width={size}
      height={h}
      viewBox={vb}
      className={className ? `ao-mark ${className}` : "ao-mark"}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={g} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#FFF0C8" />
          <stop offset="0.42" stopColor="#F2B544" />
          <stop offset="1" stopColor="#A86A14" />
        </linearGradient>
        <radialGradient id={c}>
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.55" stopColor="#FFE9B8" />
          <stop offset="1" stopColor="#F2B544" />
        </radialGradient>
      </defs>
      <g fill={`url(#${g})`}>
        <path d="M570.6 373.9 L777.9 196.1 L795.6 273.6 L647.9 448.6Z" />
        <path d="M453.4 373.9 L246.1 196.1 L228.4 273.6 L376.1 448.6Z" />
        <path d="M644.6 449.3 L885.1 436.5 L854.6 495.4 L656.7 535.8Z" />
        <path d="M379.4 449.3 L138.9 436.5 L169.4 495.4 L367.3 535.8Z" />
        <path d="M652.2 546.6 L799.7 644.0 L754.3 669.4 L619.0 608.9Z" />
        <path d="M371.8 546.6 L224.3 644.0 L269.7 669.4 L405.0 608.9Z" />
      </g>
      <path
        d="M384 512a128 128 0 1 0 256 0a128 128 0 1 0-256 0ZM432 512a80 80 0 1 1 160 0a80 80 0 1 1-160 0Z"
        fill={`url(#${g})`}
        fillRule="evenodd"
      />
      <rect x="416" y="502" width="192" height="20" rx="10" fill="#FFE3A3" opacity="0.95" />
      <circle cx="512" cy="512" r="36" fill={`url(#${c})`} />
    </svg>
  );
}

export function Wordmark({ id, size = 34 }: { id: string; size?: number }) {
  return (
    <span className="wordmark">
      <Mark id={id} size={size} />
      <span className="wordmark-text">
        {BRAND_WORD}
        {BRAND_SUFFIX ? <span className="wordmark-suffix">{BRAND_SUFFIX.toUpperCase()}</span> : null}
      </span>
      <span className="sr-only"> {BRAND_NAME}</span>
    </span>
  );
}
