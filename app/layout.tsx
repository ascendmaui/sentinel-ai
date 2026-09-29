import "./tokens.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { THEME_BOOT_SCRIPT, THEME_META } from "../lib/theme";
import { BRAND_NAME, BRAND_TAGLINE, SHOW_CODE_RAIN, SITE_URL } from "../lib/brand";
import { CodeRain } from "../components/CodeRain";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});
const body = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  preload: false,
});

const description = `${BRAND_NAME} runs scoped security assessments in three phases: passive recon of public information, a Scoped Assessment within an agreed scope and written client authorization, and remediation with retest. Built for teams shipping AI agents and the systems around them.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND_NAME}: ${BRAND_TAGLINE.toLowerCase()}`,
    template: `%s · ${BRAND_NAME}`,
  },
  description,
  applicationName: BRAND_NAME,
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    title: `${BRAND_NAME}: ${BRAND_TAGLINE.toLowerCase()}`,
    description,
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: BRAND_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_NAME,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_META.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_META.dark },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        {SHOW_CODE_RAIN ? <CodeRain /> : null}
        <Nav />
        <div id="main">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
