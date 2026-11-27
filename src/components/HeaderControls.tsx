"use client";
import { useEffect, useState } from "react";
import { useSound } from "./Providers";

export function HeaderControls() {
  const { soundOn, toggleSound } = useSound();
  const [dark, setDark] = useState(false);

  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("tessera-theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={toggleSound} aria-label={soundOn ? "Sound on, mute" : "Muted, turn sound on"} className="btn btn-ghost !min-h-[36px] !px-3 !py-1.5">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 6v4h3l4 3V3L5 6z" />
          {soundOn ? <path d="M11.5 5.5a3.5 3.5 0 010 5" /> : <path d="M11.5 6l3 4m0-4l-3 4" />}
        </svg>
        <span className="hidden text-xs sm:inline">{soundOn ? "Sound on" : "Muted"}</span>
      </button>
      <button type="button" onClick={toggleTheme} aria-label={dark ? "Dark theme, switch to light" : "Light theme, switch to dark"} className="btn btn-ghost !min-h-[36px] !px-3 !py-1.5">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M13 9.5A5.5 5.5 0 116.5 3 4.5 4.5 0 0013 9.5z" />
        </svg>
        <span className="hidden text-xs sm:inline">{dark ? "Dark" : "Light"}</span>
      </button>
    </div>
  );
}
