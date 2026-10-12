import { get, list, put } from "@vercel/blob";

export async function putJSON(path: string, data: unknown) {
  await put(path, JSON.stringify(data, null, 2), { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true });
}

export async function getJSON<T>(path: string): Promise<T | null> {
  try {
    const r = await get(path, { access: "private", useCache: false } as never);
    if (!r || r.statusCode !== 200) return null;
    return JSON.parse(await new Response(r.stream).text()) as T;
  } catch {
    return null;
  }
}

export async function getBytes(path: string): Promise<Uint8Array | null> {
  try {
    const r = await get(path, { access: "private", useCache: false } as never);
    if (!r || r.statusCode !== 200) return null;
    return new Uint8Array(await new Response(r.stream).arrayBuffer());
  } catch {
    return null;
  }
}

export async function putBytes(path: string, bytes: Uint8Array, contentType: string) {
  await put(path, Buffer.from(bytes), { access: "private", contentType, addRandomSuffix: false, allowOverwrite: true });
}

export async function listPaths(prefix: string): Promise<string[]> {
  const out: string[] = [];
  let cursor: string | undefined;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    out.push(...r.blobs.map((b) => b.pathname));
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}

export type Order = {
  sessionId: string;
  leadId: string;
  email: string;
  domain: string;
  authorized: boolean;
  mode: string;
  amountTotal: number;
  paidAt: string;
  status: "paid" | "scanning" | "reported" | "emailed" | "email_pending" | "failed";
  attempts: number;
  lastError?: string;
  reportPath?: string;
  verifiedFindings?: number;
  emailedAt?: string;
  followupSentAt?: string;
  history: { at: string; event: string; detail?: string }[];
};

export const orderPath = (sid: string) => `orders/paid/${sid}.json`;
export const log = (o: Order, event: string, detail?: string) => o.history.push({ at: new Date().toISOString(), event, detail });
