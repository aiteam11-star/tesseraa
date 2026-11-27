/**
 * Sends transactional email through Resend when RESEND_API_KEY and EMAIL_FROM are set.
 * `sendMail` returns false when nothing was sent, so callers can say so honestly; the reason is
 * logged on the server (never the API key) so a bad key or unverified domain is easy to find.
 */
type Env = Record<string, string | undefined>;

export const mailConfigured = (env: Env = process.env) => Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);

export type MailResult =
  | { ok: true; id?: string }
  | { ok: false; reason: "not_configured" | "rejected" | "network"; status?: number; message: string };

export async function sendMailDetailed(to: string, subject: string, text: string, env: Env = process.env): Promise<MailResult> {
  const key = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  if (!key || !from) return { ok: false, reason: "not_configured", message: "RESEND_API_KEY and EMAIL_FROM are not both set." };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    const body = (await r.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (r.ok) return { ok: true, id: body.id };
    return { ok: false, reason: "rejected", status: r.status, message: (body.message ?? body.name ?? `HTTP ${r.status}`).toString().slice(0, 300) };
  } catch (e) {
    return { ok: false, reason: "network", message: (e as Error).message.slice(0, 200) };
  }
}

export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const r = await sendMailDetailed(to, subject, text);
  if (r.ok) return true;
  if (r.reason === "rejected") console.error(`[mail] Resend rejected the message (status ${r.status}): ${r.message}`);
  else if (r.reason === "network") console.error(`[mail] Could not reach Resend: ${r.message}`);
  return false; // "not_configured" is expected in development and is reported by the callers
}
