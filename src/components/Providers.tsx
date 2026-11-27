"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ensureAudio, playSeat } from "@/lib/sound";

type Ctx = { soundOn: boolean; toggleSound: () => void; playSeat: () => void };
type Toast = { id: number; kind: "success" | "error"; text: string };
const ToastCtx = createContext<(text: string, kind?: "success" | "error") => void>(() => {});
/** Shows a short message. Call it only after the operation it reports has actually finished. */
export const useToast = () => useContext(ToastCtx);
const SoundCtx = createContext<Ctx>({ soundOn: false, toggleSound: () => {}, playSeat: () => {} });
export const useSound = () => useContext(SoundCtx);

export function Providers({ children }: { children: React.ReactNode }) {
  // Sound is muted by default. The choice is remembered per browser.
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("tessera-sound") === "on") setSoundOn(true);
    } catch {}
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      const next = !on;
      try {
        localStorage.setItem("tessera-sound", next ? "on" : "off");
      } catch {}
      if (next) {
        ensureAudio();
        setTimeout(playSeat, 30); // audible confirmation when turning on
      }
      return next;
    });
  }, []);

  const play = useCallback(() => {
    if (soundOn) playSeat();
  }, [soundOn]);

  const value = useMemo(() => ({ soundOn, toggleSound, playSeat: play }), [soundOn, toggleSound, play]);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((text: string, kind: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 7000 : 4000);
  }, []);

  return (
    <SoundCtx.Provider value={value}>
      <ToastCtx.Provider value={toast}>
        {children}
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite" aria-atomic="false">
          {toasts.map((t) => (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex items-start gap-3 rounded-lg border bg-surface px-4 py-3 text-sm shadow-lg ${t.kind === "error" ? "border-risk/60" : "border-accent/50"}`}
            >
              <span aria-hidden="true" className={`mt-1 h-2 w-2 shrink-0 rounded-full ${t.kind === "error" ? "bg-risk" : "bg-accent"}`} />
              <span className="flex-1">{t.text}</span>
              <button type="button" aria-label="Dismiss" className="text-muted hover:text-ink" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>×</button>
            </div>
          ))}
        </div>
      </ToastCtx.Provider>
    </SoundCtx.Provider>
  );
}
