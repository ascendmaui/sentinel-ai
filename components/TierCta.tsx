import Link from "next/link";
import { tierById, tierHref, type TierId } from "../lib/tiers";
import { BRAND_EMAIL, BRAND_MAIL } from "../lib/brand";

/** Inline call to action pointing at one tier and the full comparison. */
export function TierCta({ tier, lead }: { tier: TierId; lead: string }) {
  const t = tierById(tier);
  if (!t) return null;
  return (
    <aside className="tier-cta-inline" aria-label={`${t.name} tier`}>
      <p>
        <strong>{t.name}. </strong>
        {lead}
      </p>
      <div className="row">
        <Link className="btn btn-gold btn-sm" href={tierHref(tier)}>
          See {t.name}
        </Link>
        <Link className="btn btn-glass btn-sm" href="/pricing#compare">
          Compare all four tiers
        </Link>
        <a className="btn btn-glass btn-sm" href={`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}%20${t.name}%20inquiry`}>
          Email us
        </a>
      </div>
    </aside>
  );
}
