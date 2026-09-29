import Link from "next/link";
import { Wordmark } from "./Logo";
import { ThemeSwitcher } from "./ThemeSwitcher";

const links = [
  { href: "/#phases", label: "Phases" },
  { href: "/#who", label: "Who it's for" },
  { href: "/#how", label: "How it works" },
  { href: "/#contact", label: "Contact" },
];

export function Nav() {
  return (
    <header className="nav-wrap">
      <nav className="nav" aria-label="Main">
        <Link href="/" className="nav-brand" aria-label="Sentinel AI home">
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
          <a className="btn btn-gold btn-sm" href="mailto:ascendmaui@gmail.com?subject=Sentinel%20AI">
            Talk to us
          </a>
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
