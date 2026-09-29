import "./tokens.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { THEME_BOOT_SCRIPT, THEME_META } from "../lib/theme";

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

const description =
  "Sentinel AI runs authorized security assessments in three phases: reconnaissance, an authorized offensive pass, and remediation guidance — so teams find and fix what matters.";

export const metadata: Metadata = {
  metadataBase: new URL("https://sentinel-ai-tawny.vercel.app"),
  title: {
    default: "Sentinel AI — authorized security assessments",
    template: "%s · Sentinel AI",
  },
  description,
  applicationName: "Sentinel AI",
  openGraph: {
    type: "website",
    siteName: "Sentinel AI",
    title: "Sentinel AI — authorized security assessments",
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sentinel AI",
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
        <Nav />
        <div id="main">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
