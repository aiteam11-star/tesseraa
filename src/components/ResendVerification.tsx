"use client";
import { useState } from "react";
import { Spinner } from "./forms";
import { useToast } from "./Providers";

/** Asks the server to email a fresh confirmation link. In development with no email provider it shows the link instead. */
export function ResendVerification({ className = "btn btn-ghost !min-h-[36px] text-sm" }: { className?: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  async function send() {
    setBusy(true);
    try {
      const r = await fetch("/api/auth/verify/resend", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) toast(d.error ?? "Could not send the link.", "error");
      else if (d.alreadyVerified) toast("Your email is already confirmed.");
      else if (d.devLink) { setDevLink(d.devLink); toast("No email provider is set up, so the link is shown below (development only)."); }
      else if (d.sent) toast(`Confirmation link sent to ${d.email}.`);
      else toast("The link could not be emailed because no email provider is configured.", "error");
    } catch {
      toast("Could not reach the server.", "error");
    }
    setBusy(false);
  }
  return (
    <>
      <button type="button" className={className} onClick={send} disabled={busy}>{busy ? <><Spinner /> Sending</> : "Send a new link"}</button>
      {devLink && <p className="basis-full break-all text-xs text-muted">Development link: <a className="underline" href={devLink}>{devLink}</a></p>}
    </>
  );
}
