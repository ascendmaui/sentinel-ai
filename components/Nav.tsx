import Link from "next/link";
import { Wordmark } from "./Logo";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { BRAND_MAIL, BRAND_NAME, BRAND_EMAIL } from "../lib/brand";

export const NAV_LINKS = [
  { href: "/#phases", label: "Phases" },
  { href: "/#who", label: "Who it's for" },
  { href: "/#how", label: "How it works" },
  { href: "/pricing", label: "Services" },
  { href: "/incident-case-studies", label: "Incidents" },
  { href: "/blog", label: "Blog" },
  { href: "/case-studies", label: "Case studies" },
  { href: "/#contact", label: "Contact" },
];

export function Nav() {
  return (
    <header className="nav-wrap">
      <nav className="nav" aria-label="Main">
        <Link href="/" className="nav-brand" aria-label={`${BRAND_NAME} home`}>
          <Wordmark id="nav" />
        </Link>
        <div className="nav-links">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="nav-actions">
          <ThemeSwitcher className="nav-theme" />
          <a className="btn btn-gold btn-sm" href={`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}`}>
            Talk to us
          </a>
          <details className="nav-menu">
            <summary aria-label="Open menu">
              <span />
              <span />
            </summary>
            <div className="nav-menu-panel">
              {NAV_LINKS.map((l) => (
                <Link key={l.href} href={l.href}>
                  {l.label}
                </Link>
              ))}
              <div className="nav-menu-theme">
                <span className="nav-menu-label" aria-hidden="true">
                  Theme
                </span>
                <ThemeSwitcher showLabels />
              </div>
            </div>
          </details>
        </div>
      </nav>
    </header>
  );
}
