import Link from "next/link";
import { scanTierHref, scanTiers } from "../lib/scanTiers";
import { TierEmblem } from "./TierEmblem";

export function ScanTierStrip() {
  return (
    <div className="tier-strip">
      {scanTiers.map((tier) => (
        <Link key={tier.id} href={scanTierHref(tier.id)} className={tier.id === "full" ? "tier-strip-top" : undefined}>
          <span className="tier-emblem-wrap">
            <TierEmblem id={tier.emblem} size={30} />
          </span>
          <strong>
            {tier.label}
            <span className="scan-class"> · {tier.className}</span>
          </strong>
          <span className="pos">{tier.positioning}</span>
          <p>{tier.tagline}</p>
        </Link>
      ))}
    </div>
  );
}
