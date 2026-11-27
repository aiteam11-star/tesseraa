import { afterEach, describe, expect, it, vi } from "vitest";
import { mailConfigured, sendMail, sendMailDetailed } from "@/lib/mail";

const env = { RESEND_API_KEY: "re_secret_key_123", EMAIL_FROM: "Tessera <noreply@example.com>" };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const reply = (status: number, body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

describe("mail configuration", () => {
  it("needs both the key and the sender address", () => {
    expect(mailConfigured({})).toBe(false);
    expect(mailConfigured({ RESEND_API_KEY: "x" })).toBe(false);
    expect(mailConfigured(env)).toBe(true);
  });
  it("does not call the network when unconfigured", async () => {
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    const r = await sendMailDetailed("a@b.co", "s", "t", {});
    expect(r).toMatchObject({ ok: false, reason: "not_configured" });
    expect(f).not.toHaveBeenCalled();
  });
});

describe("sending through Resend", () => {
  it("returns the message id on success and sends the right request", async () => {
    const f = reply(200, { id: "msg_1" }); vi.stubGlobal("fetch", f);
    const r = await sendMailDetailed("to@example.com", "Hello", "Body", env);
    expect(r).toEqual({ ok: true, id: "msg_1" });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_secret_key_123");
    expect(JSON.parse(init.body)).toMatchObject({ from: env.EMAIL_FROM, to: "to@example.com", subject: "Hello", text: "Body" });
  });
  it("reports why Resend refused (for example an unverified domain)", async () => {
    vi.stubGlobal("fetch", reply(403, { name: "validation_error", message: "The example.com domain is not verified." }));
    const r = await sendMailDetailed("to@example.com", "s", "t", env);
    expect(r).toMatchObject({ ok: false, reason: "rejected", status: 403 });
    expect((r as { message: string }).message).toMatch(/not verified/);
  });
  it("reports a bad API key", async () => {
    vi.stubGlobal("fetch", reply(401, { name: "missing_api_key", message: "API key is invalid" }));
    expect(await sendMailDetailed("to@example.com", "s", "t", env)).toMatchObject({ ok: false, reason: "rejected", status: 401 });
  });
  it("reports a network failure instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND api.resend.com")));
    expect(await sendMailDetailed("to@example.com", "s", "t", env)).toMatchObject({ ok: false, reason: "network" });
  });
});

describe("sendMail logging", () => {
  it("logs the reason when refused and never prints the API key", async () => {
    const prev = { ...process.env };
    Object.assign(process.env, env);
    try {
      vi.stubGlobal("fetch", reply(403, { message: "domain not verified" }));
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(await sendMail("to@example.com", "s", "t")).toBe(false);
      const logged = err.mock.calls.flat().join(" ");
      expect(logged).toMatch(/status 403/);
      expect(logged).toMatch(/domain not verified/);
      expect(logged).not.toContain("re_secret_key_123");
    } finally { process.env.RESEND_API_KEY = prev.RESEND_API_KEY; process.env.EMAIL_FROM = prev.EMAIL_FROM; if (!prev.RESEND_API_KEY) delete process.env.RESEND_API_KEY; if (!prev.EMAIL_FROM) delete process.env.EMAIL_FROM; }
  });
  it("returns true on success", async () => {
    const prev = { ...process.env };
    Object.assign(process.env, env);
    try { vi.stubGlobal("fetch", reply(200, { id: "m" })); expect(await sendMail("to@example.com", "s", "t")).toBe(true); }
    finally { if (!prev.RESEND_API_KEY) delete process.env.RESEND_API_KEY; if (!prev.EMAIL_FROM) delete process.env.EMAIL_FROM; }
  });
});
