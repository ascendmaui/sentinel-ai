import { cfg } from "./config";
import { putJSON } from "./store";

export type Mail = { to: string; subject: string; text: string; html?: string; attachments?: { filename: string; content: string }[]; headers?: Record<string, string> };

/** Sends through Resend when RESEND_API_KEY is set. Without a key nothing is sent: the message is written
 * to Blob (mail/outbox) and logged, and the caller gets sent=false so it can mark the order email_pending. */
export async function sendMail(m: Mail): Promise<{ sent: boolean; id?: string; error?: string }> {
  if (!cfg.resendKey) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await putJSON(`mail/outbox/${id}.json`, { ...m, attachments: m.attachments?.map((a) => a.filename), queuedAt: new Date().toISOString(), reason: "RESEND_API_KEY not set" });
    console.log(`[mail] NOT SENT (no RESEND_API_KEY) to=${String(m.to).replace(/^(.).*(@.*)$/, "$1***$2")} subject="${m.subject}" outbox=${id}`);
    return { sent: false, id, error: "no_provider" };
  }
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${cfg.resendKey}`, "content-type": "application/json" },
        body: JSON.stringify({ from: cfg.mailFrom, to: [m.to], subject: m.subject, text: m.text, html: m.html, attachments: m.attachments, headers: m.headers }),
      });
      const j = (await r.json().catch(() => ({}))) as { id?: string; message?: string };
      if (r.ok) return { sent: true, id: j.id };
      if (r.status < 500 && r.status !== 429) return { sent: false, error: j.message ?? `resend ${r.status}` };
    } catch (e) {
      if (i === 2) return { sent: false, error: (e as Error).message };
    }
    await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
  }
  return { sent: false, error: "resend retries exhausted" };
}

export const alert = (subject: string, text: string) => sendMail({ to: cfg.alertEmail, subject: `[Seraphim Scan] ${subject}`, text });
