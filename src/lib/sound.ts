"use client";
/** A soft synthesized click. No audio assets. Created lazily after a user gesture. */
let ctx: AudioContext | null = null;

export function ensureAudio() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function playSeat() {
  const c = ensureAudio();
  if (!c || c.state !== "running") return;
  const t = c.currentTime;
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.07, t + 0.004);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
  out.connect(c.destination);

  const tick = c.createOscillator();
  tick.type = "triangle";
  tick.frequency.setValueAtTime(620, t);
  tick.frequency.exponentialRampToValueAtTime(330, t + 0.06);
  tick.connect(out);
  tick.start(t);
  tick.stop(t + 0.12);

  const body = c.createOscillator();
  const bodyGain = c.createGain();
  bodyGain.gain.value = 0.6;
  body.type = "sine";
  body.frequency.setValueAtTime(170, t);
  body.connect(bodyGain).connect(out);
  body.start(t);
  body.stop(t + 0.1);
}
