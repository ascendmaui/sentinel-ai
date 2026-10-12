import { putJSON } from "../../../lib/pipeline/store";
import { checkUnsub, emailKey } from "../../../lib/pipeline/sign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: Request) {
  const u = new URL(req.url);
  const e = (u.searchParams.get("e") ?? "").toLowerCase();
  if (!e || !checkUnsub(e, u.searchParams.get("sig") ?? "")) return new Response("Invalid unsubscribe link.", { status: 400 });
  await putJSON(`unsub/${emailKey(e)}.json`, { at: new Date().toISOString() });
  return new Response("<!doctype html><meta charset=utf-8><title>Unsubscribed</title><body style='font-family:system-ui;padding:40px'><h1>You are unsubscribed.</h1><p>Seraphim Scan will not send you follow-up emails. Reports you paid for are still delivered.</p></body>", { headers: { "content-type": "text/html" } });
}
export const GET = handle;
export const POST = handle;
