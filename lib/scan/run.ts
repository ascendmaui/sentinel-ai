import { AUTHORIZATION_STATEMENT, tierAtLeast, type ScanTierId } from "../scanTiers";
import { bareHostname } from "./ssrf";
import { observeAux, observeCt, observeDns, observeHttp, observeSitemap, observeTls } from "./observe";
import { buildReport } from "./report";
import type { AuxResult, Report } from "./types";

const skipped = (reason: string): AuxResult => ({ state: "skipped", reason });

export async function runScan(input: {
  id: string;
  targetUrl: string;
  companyName: string | null;
  tier: ScanTierId;
  affirmedAt: string;
}): Promise<Report> {
  const host = bareHostname(new URL(input.targetUrl).hostname);
  const [homepage, dnsResult, tls, ct] = await Promise.all([
    observeHttp(input.targetUrl),
    observeDns(host),
    observeTls(host),
    observeCt(host),
  ]);

  let securityTxt: AuxResult = skipped("Included from the Standard tier.");
  let robots: AuxResult = skipped("Included from the Advanced tier.");
  let sitemap: AuxResult = skipped("Included from the Advanced tier.");

  if (homepage.ok && tierAtLeast(input.tier, "standard")) {
    const origin = new URL(homepage.finalUrl).origin;
    securityTxt = await observeAux(`${origin}/.well-known/security.txt`, 100_000);
  } else if (tierAtLeast(input.tier, "standard") && !homepage.ok) {
    securityTxt = skipped("The homepage could not be fetched, so security.txt was not requested.");
  }

  if (homepage.ok && tierAtLeast(input.tier, "advanced")) {
    const origin = new URL(homepage.finalUrl).origin;
    robots = await observeAux(`${origin}/robots.txt`, 200_000);
    sitemap = await observeSitemap(homepage.finalUrl, robots);
  } else if (tierAtLeast(input.tier, "advanced") && !homepage.ok) {
    const reason = "The homepage could not be fetched, so robots.txt and the sitemap were not requested.";
    robots = skipped(reason);
    sitemap = skipped(reason);
  }

  return buildReport({
    id: input.id,
    createdAt: input.affirmedAt,
    tier: input.tier,
    companyName: input.companyName,
    affirmedAt: input.affirmedAt,
    statement: AUTHORIZATION_STATEMENT,
    observation: {
      requestedUrl: input.targetUrl,
      host,
      homepage,
      tls,
      dns: dnsResult,
      securityTxt,
      robots,
      sitemap,
      ct,
    },
  });
}
