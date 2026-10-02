import Link from "next/link";
import { Wordmark } from "./Logo";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { BRAND_NAME, BRAND_PARENT, BRAND_EMAIL } from "../lib/brand";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-bottom" style={{ borderTop: "1px solid var(--ao-line-soft)", paddingTop: 28 }}>
        <Link href="/" aria-label={`${BRAND_NAME} home`}>
          <Wordmark id="footer" size={24} />
        </Link>
        <nav className="footer-links" aria-label="Footer">
          <Link href="/scan">Scan</Link>
          <Link href="/pricing">Services</Link>
          <Link href="/#phases">Phases</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/incident-case-studies">Incidents</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/case-studies">Case studies</Link>
          <Link href="/#contact">Contact</Link>
          <a href={`mailto:${BRAND_EMAIL}`}>{BRAND_EMAIL}</a>
        </nav>
        <div className="footer-theme">
          <span className="footer-theme-label" aria-hidden="true">
            Theme
          </span>
          <ThemeSwitcher showLabels />
        </div>
        <p className="footer-fine">© 2026 {BRAND_NAME} · {BRAND_PARENT}</p>
      </div>
    </footer>
  );
}
