import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { Wordmark } from "../../components/Logo";

export const metadata: Metadata = { title: "Partner marketing kit", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const KIT = "/partners-kit";
const root = path.join(process.cwd(), "public", "partners-kit");
const list = (dir: string) => fs.readdirSync(path.join(root, dir)).sort();
const doc = (f: string) => fs.readFileSync(path.join(root, "docs", f), "utf8");
type Post = { n: number; network: string; image: string; copy: string };

function Doc({ file }: { file: string }) {
  return (
    <div className="pk-doc">
      <pre>{doc(file)}</pre>
      <a className="pk-dl" href={`${KIT}/docs/${file}`} download>Download {file}</a>
    </div>
  );
}

export default function MarketingKit() {
  const posts: Post[] = JSON.parse(fs.readFileSync(path.join(root, "social", "posts.json"), "utf8"));
  const ads = list("ads");
  const banners = list("banners");
  const logos = list("logos");
  return (
    <main className="pk">
      <header className="pk-hero section-art">
        <Wordmark id="pk" size={56} />
        <h1>Partner marketing kit</h1>
        <p>Everything you need to introduce Seraphim Scan: logos, the one-pager, social posts, ad creatives, banners, templates and FAQ. Please follow the brand usage rules below.</p>
        <div className="pk-actions">
          <a className="btn btn-gold" href={`${KIT}/Seraphim-Scan-Marketing-Kit.zip`} download>Download the full kit (zip)</a>
          <a className="btn" href={`${KIT}/Seraphim-Scan-One-Pager.pdf`} download>One-pager (PDF)</a>
        </div>
        <nav className="pk-toc">
          {["pitch", "brand", "logos", "social", "ads", "partners", "templates", "faq"].map((s) => <a key={s} href={`#${s}`}>{s}</a>)}
        </nav>
      </header>

      <section id="pitch"><h2>Pitch blurb and boilerplate</h2><Doc file="pitch-boilerplate.md" /></section>
      <section id="brand"><h2>Brand usage</h2><Doc file="brand-usage.md" />
        <a className="pk-dl" href={`${KIT}/docs/brand-guide.md`} download>Full brand guide</a></section>

      <section id="logos"><h2>Logos and icons</h2>
        <div className="pk-grid pk-logos">
          {logos.map((f) => (
            <a key={f} href={`${KIT}/logos/${f}`} download className={f.includes("light") || f.includes("black") ? "pk-tile pk-tile-light" : "pk-tile"}>
              <img src={`${KIT}/logos/${f}`} alt={f} loading="lazy" /><span>{f}</span>
            </a>
          ))}
          <a href={`${KIT}/icons/app-icon-1024.png`} download className="pk-tile"><img src={`${KIT}/icons/app-icon-1024.png`} alt="App icon" /><span>app-icon-1024.png</span></a>
        </div>
      </section>

      <section id="social"><h2>Social posts</h2>
        <div className="pk-grid">
          {posts.map((p) => (
            <figure key={p.n} className="pk-post">
              <a href={`${KIT}/social/${p.image}`} download><img src={`${KIT}/social/${p.image}`} alt="" loading="lazy" /></a>
              <figcaption><b>{p.network === "x" ? "X" : p.network === "linkedin" ? "LinkedIn" : "Instagram"}</b> {p.copy}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="ads"><h2>Ad creatives</h2>
        <p className="pk-note">Three copy variants (A, B, C) in 1080x1080, 1200x628, 1080x1920, 300x250 and 728x90.</p>
        <ul className="pk-copy">
          <li><b>A.</b> Ship AI agents. Know your exposure. CTA: Book a Scoped Assessment</li>
          <li><b>B.</b> See what the internet already sees. CTA: See how it works</li>
          <li><b>C.</b> Find it. Fix it. Retest it. CTA: Talk to us</li>
        </ul>
        <div className="pk-grid">
          {ads.map((f) => <a key={f} href={`${KIT}/ads/${f}`} download className="pk-tile"><img src={`${KIT}/ads/${f}`} alt={f} loading="lazy" /><span>{f}</span></a>)}
        </div>
      </section>

      <section id="partners"><h2>Partner program</h2><Doc file="partner-program.md" />
        <h3>Banner set</h3>
        <div className="pk-grid">
          {banners.map((f) => <a key={f} href={`${KIT}/banners/${f}`} download className="pk-tile"><img src={`${KIT}/banners/${f}`} alt={f} loading="lazy" /><span>{f}</span></a>)}
        </div>
      </section>
      <section id="templates"><h2>Referral email and DM templates</h2><Doc file="templates.md" /></section>
      <section id="faq"><h2>Talking points and FAQ</h2><Doc file="talking-points-faq.md" /></section>
    </main>
  );
}
