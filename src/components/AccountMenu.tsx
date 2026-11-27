"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./CoverArt";
import { useToast } from "./Providers";

type R = "client" | "freelancer";

export function AccountMenu({ name, role, roles, hue, avatarUrl }: { name: string; role: R; roles: R[]; hue: number; avatarUrl: string | null }) {
  const other: R = role === "client" ? "freelancer" : "client";
  const hasOther = roles.includes(other);
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); root.current?.querySelector<HTMLElement>("button")?.focus(); }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  async function switchTo(create: boolean) {
    setBusy(true);
    try {
      const r = await fetch("/api/account/role", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: other, create }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast(d.error ?? "Could not switch profiles.", "error"); setBusy(false); return; }
      setOpen(false);
      toast(create ? `Your ${other} profile is ready. Let's set it up.` : `Switched to your ${other} profile.`);
      router.push(d.redirect ?? "/dashboard");
      router.refresh();
    } catch {
      toast("Could not reach the server.", "error");
    }
    setBusy(false);
  }

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const item = "block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-sunken focus-visible:bg-sunken";
  return (
    <div ref={root} className="relative">
      <button
        type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex min-h-[36px] items-center gap-2 rounded-md border border-line bg-surface py-1 pl-1 pr-3 text-sm transition-colors hover:bg-sunken"
      >
        <Avatar name={name} hue={hue} size={28} src={avatarUrl} />
        <span className="max-w-[120px] truncate">{name}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3.5l3 3 3-3" /></svg>
      </button>
      {open && (
        <div role="menu" aria-label="Account" className="absolute right-0 z-40 mt-2 w-56 rounded-lg border border-line bg-surface p-1.5 shadow-lg">
          <div className="border-b border-line px-3 pb-2 pt-1.5">
            <div className="truncate text-sm font-medium">{name}</div>
            <div className="text-xs capitalize text-muted">{role} profile{roles.length > 1 ? " · 2 profiles" : ""}</div>
          </div>
          <div className="pt-1.5">
            <button role="menuitem" type="button" className={`${item} font-medium text-accent-strong`} onClick={() => switchTo(!hasOther)} disabled={busy}>
              {hasOther ? `Switch to ${other} profile` : `Add a ${other} profile`}
            </button>
            <Link role="menuitem" href="/profile" className={item} onClick={() => setOpen(false)}>My Profile</Link>
            <Link role="menuitem" href="/profile/edit" className={item} onClick={() => setOpen(false)}>Edit Profile</Link>
            <Link role="menuitem" href="/settings" className={item} onClick={() => setOpen(false)}>Account Settings</Link>
            <button role="menuitem" type="button" className={`${item} text-risk`} onClick={signOut} disabled={busy}>{busy ? "Signing out" : "Sign Out"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
