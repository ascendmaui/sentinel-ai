import { NextResponse, type NextRequest } from "next/server";

export const COOKIE = "ss_partner";

async function sha(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`seraphim-scan:${text}`));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Gate /marketing-kit and /partners-kit behind the MARKETING_KIT_PASSWORD env var. */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/marketing-kit/login")) {
    const r = NextResponse.next();
    r.headers.set("X-Robots-Tag", "noindex, nofollow");
    return r;
  }
  const pw = process.env.MARKETING_KIT_PASSWORD;
  const ok = pw && req.cookies.get(COOKIE)?.value === (await sha(pw));
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/marketing-kit/login";
    url.search = "";
    const r = NextResponse.redirect(url);
    r.headers.set("X-Robots-Tag", "noindex, nofollow");
    return r;
  }
  const r = NextResponse.next();
  r.headers.set("X-Robots-Tag", "noindex, nofollow");
  r.headers.set("Cache-Control", "private, no-store");
  return r;
}

export const config = { matcher: ["/marketing-kit", "/marketing-kit/:path*", "/partners-kit/:path*"] };
