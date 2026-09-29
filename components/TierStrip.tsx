import Link from "next/link";
import { tiers, tierHref } from "../lib/tiers";
import { TierEmblem } from "./TierEmblem";

export function TierStrip() {
  return (
    <div className="tier-strip">
      {tiers.map((t) => (
        <Link key={t.id} href={tierHref(t.id)} className={t.id === "seraphim" ? "tier-strip-top" : undefined}>
          <span className="tier-emblem-wrap">
            <TierEmblem id={t.id} size={30} />
          </span>
          <strong>{t.name}</strong>
          <span className="pos">{t.positioning}</span>
          <p>{t.tagline}</p>
        </Link>
      ))}
    </div>
  );
}
