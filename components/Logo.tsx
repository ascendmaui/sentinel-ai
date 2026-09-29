import { BRAND_NAME, BRAND_SUFFIX, BRAND_WORD } from "../lib/brand";

type MarkProps = {
  size?: number;
  id: string;
  className?: string;
  title?: string;
};

/**
 * Seraphim mark: six wings around a slim flame-shaped body, a small halo, and a bright point
 * of light in the chest. Text-free on purpose, so renaming the brand never touches it.
 * Colors come from the theme mark tokens (gold on dark).
 */
export function Mark({ size = 32, id, className, title }: MarkProps) {
  const g = `sa-gold-${id}`;
  const w = `sa-wing-${id}`;
  const c = `sa-core-${id}`;
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
        <linearGradient id={g} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" className="ao-mark-hi" />
          <stop offset="0.5" className="ao-mark-mid" />
          <stop offset="1" className="ao-mark-lo" />
        </linearGradient>
        <radialGradient id={c}>
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.5" className="ao-mark-jewel-stop" />
          <stop offset="1" className="ao-mark-mid" stopOpacity="0" />
        </radialGradient>
        <g id={w} fill={`url(#${g})`}>
          <path d="M15 11.4C11 10.6 6.2 7.6 2 2.6 8.2 3.8 12.4 6 15 9.2Z" />
          <path d="M15 14C10.6 13.6 5.4 11.6 0.8 8.6 7 8.6 11.8 10.2 15 12.4Z" />
          <path d="M15 16.6C11.4 17 7 16.4 3 14.2 8 13.4 12 14 15 15.2Z" opacity="0.92" />
          <path d="M15 19.4C12.6 21 9.4 22.2 6.4 22.4 9.4 19.6 12.2 18.2 15 17.8Z" opacity="0.8" />
        </g>
      </defs>
      <use href={`#${w}`} />
      <use href={`#${w}`} transform="translate(32 0) scale(-1 1)" />
      <path
        d="M16 8.6c1.5 3 2.2 6.6 2.2 10.2 0 3.6-.8 6.6-2.2 9.6-1.4-3-2.2-6-2.2-9.6 0-3.6.7-7.2 2.2-10.2Z"
        fill={`url(#${g})`}
      />
      <ellipse cx="16" cy="4.6" rx="3.6" ry="1.15" fill="none" strokeWidth="0.8" className="ao-mark-halo" />
      <circle cx="16" cy="7.2" r="1.5" className="ao-mark-tip" />
      <circle cx="16" cy="15.4" r="3.4" fill={`url(#${c})`} />
      <circle cx="16" cy="15.4" r="1.05" className="ao-mark-jewel" />
    </svg>
  );
}

export function Wordmark({ id, size = 28 }: { id: string; size?: number }) {
  return (
    <span className="wordmark">
      <Mark id={id} size={size} />
      <span className="wordmark-text">
        {BRAND_WORD}
        {BRAND_SUFFIX ? <span>{BRAND_SUFFIX}</span> : null}
      </span>
      <span className="sr-only"> {BRAND_NAME}</span>
    </span>
  );
}
