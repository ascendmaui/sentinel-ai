import Link from "next/link";
import { Wordmark } from "./Logo";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { BRAND_NAME } from "../lib/brand";

const links = [
  { href: "/scan", label: "Scan" },
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
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="nav-actions">
          <ThemeSwitcher className="nav-theme" />
          <Link className="btn btn-gold btn-sm" href="/scan">
            Start a scan
          </Link>
          <details className="nav-menu">
            <summary aria-label="Open menu">
              <span />
              <span />
            </summary>
            <div className="nav-menu-panel">
              {links.map((l) => (
                <Link key={l.href} href={l.href}>
                  {l.label}
                </Link>
              ))}
              <div className="nav-menu-theme">
                <span className="nav-menu-label">Theme</span>
                <ThemeSwitcher showLabels />
              </div>
            </div>
          </details>
        </div>
      </nav>
    </header>
  );
}
