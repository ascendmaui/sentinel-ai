import { NextResponse } from "next/server";

async function sha(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`seraphim-scan:${text}`));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const given = String(form.get("password") ?? "");
  const pw = process.env.MARKETING_KIT_PASSWORD;
  const base = new URL(req.url);
  if (!pw || !safeEqual(await sha(given), await sha(pw))) {
    return NextResponse.redirect(new URL("/marketing-kit/login?e=1", base), 303);
  }
  const r = NextResponse.redirect(new URL("/marketing-kit", base), 303);
  r.cookies.set("ss_partner", await sha(pw), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return r;
}
