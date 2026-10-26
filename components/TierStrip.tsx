import Link from "next/link";
import { tierById, tierHref, tiers } from "../lib/tiers";
import { TierEmblem } from "./TierEmblem";

export function TierStrip({ activeTier, className = "" }: { activeTier?: string; className?: string } = {}) {
  const active = activeTier ? tierById(activeTier)?.id : undefined;
  return (
    <div className={`tier-strip ${className}`.trim()}>
      {tiers.map((t) => {
        const isTop = t.id === "seraphim";
        const isActive = active === t.id;
        const cls = [isTop ? "tier-strip-top" : "", isActive ? "tier-strip-active" : ""].filter(Boolean).join(" ") || undefined;
        return (
          <Link key={t.id} href={tierHref(t.id)} className={cls}>
            <span className="tier-emblem-wrap">
              <TierEmblem id={t.id} size={30} />
            </span>
            <strong>{t.name}</strong>
            <span className="pos">{t.positioning}</span>
            <p>{t.tagline}</p>
          </Link>
        );
      })}
    </div>
  );
}
