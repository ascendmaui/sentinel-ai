import Link from "next/link";
import { Wordmark } from "./Logo";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-bottom" style={{ borderTop: "1px solid var(--ao-line-soft)", paddingTop: 28 }}>
        <Link href="/" aria-label="Sentinel AI home">
          <Wordmark id="footer" size={24} />
        </Link>
        <nav className="footer-links" aria-label="Footer">
          <Link href="/#phases">Phases</Link>
          <Link href="/#who">Who it&apos;s for</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/case-studies">Case studies</Link>
          <Link href="/#contact">Contact</Link>
          <a href="mailto:ascendmaui@gmail.com">ascendmaui@gmail.com</a>
        </nav>
        <div className="footer-theme">
          <span className="footer-theme-label" aria-hidden="true">
            Theme
          </span>
          <ThemeSwitcher showLabels />
        </div>
        <p className="footer-fine">© 2026 Sentinel AI · Ascend Maui</p>
      </div>
    </footer>
  );
}
