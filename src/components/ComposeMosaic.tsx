"use client";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { StructuredBrief } from "@/lib/types";
import { BriefBoard, type BoardPhase } from "./mosaic/BriefBoard";

const EXAMPLES = [
  { label: "Pottery studio booking site", text: "We run a pottery studio and take class bookings over Instagram DMs, which is chaos. Need a simple website where people can see our classes, pick a session, pay, and get a confirmation email. We also need a way to add or change classes without calling a developer. Has to work well on phones. Budget is around $6,500 and we want it live in six weeks." },
  { label: "Clinic dashboard", text: "Our clinic has two years of appointment data in spreadsheets and a booking system export. We want to see no-shows, busiest hours and which services run late, in one dashboard the front desk can open each morning. Maybe some prediction of no-shows if that is realistic. About $4,800, hoping for five weeks." },
  { label: "Brand video, tight budget", text: "We need a cool brand video, something that shows who we are. Fast turnaround. Budget is tight, maybe 2500. Should look premium and have motion and music." },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Target = { dx: number; dy: number; rot: number; jx: number; jy: number };

export function ComposeMosaic() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<BoardPhase>("idle");
  const [brief, setBrief] = useState<StructuredBrief | null>(null);
  const [budget, setBudget] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [targets, setTargets] = useState<Target[] | null>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  const words = useMemo(() => (phase === "idle" ? [] : text.trim().split(/\s+/).slice(0, 90)), [phase, text]);
  const busy = phase !== "idle";

  // When loading starts, measure where each word is and where the tiles are, so words can fly into them.
  useLayoutEffect(() => {
    if (phase !== "loading" || reduce) return;
    const tiles = Array.from(document.querySelectorAll<HTMLElement>("[data-tile]")).map((el) => el.getBoundingClientRect());
    if (!tiles.length) return;
    setTargets(
      words.map((_, i) => {
        const w = wordRefs.current[i]?.getBoundingClientRect();
        const t = tiles[i % tiles.length];
        if (!w) return { dx: 0, dy: 0, rot: 0, jx: 0, jy: 0 };
        const rnd = (n: number) => (Math.sin(i * 12.9898 + n) * 43758.5453) % 1;
        return {
          dx: t.left + t.width * (0.2 + 0.6 * Math.abs(rnd(1))) - (w.left + w.width / 2),
          dy: t.top + t.height * (0.3 + 0.4 * Math.abs(rnd(2))) - (w.top + w.height / 2),
          rot: rnd(3) * 40, jx: rnd(4) * 26, jy: rnd(5) * 18,
        };
      }),
    );
    canvasRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [phase, reduce, words]);

  async function submit() {
    if (text.trim().length < 15) { setError("Describe the project in a sentence or two first."); return; }
    setError(null); setTargets(null); setPhase("loading");
    const started = Date.now();
    try {
      const res = await fetch("/api/brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.issues?.[0] ?? data.error ?? "Something went wrong");
      await sleep(Math.max(0, (reduce ? 300 : 2400) - (Date.now() - started)));
      const b: StructuredBrief = data.brief;
      const mid = (b.suggestedBudgetRange.low + b.suggestedBudgetRange.high) / 2;
      const initial = data.statedBudget ?? Math.round(mid / 50) * 50;
      setBrief(b); setBudget(initial); setPhase("ready");
      const created = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawBrief: text, brief: b, budget: initial }) });
      const proj = await created.json();
      if (!created.ok) throw new Error(proj.error ?? "Could not save the brief");
      await sleep(reduce ? 200 : 1400);
      router.push(`/brief/${proj.id}${data.source === "fallback" ? "?src=fallback" : ""}`);
    } catch (e) {
      setPhase("idle"); setBrief(null); setTargets(null);
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="compose-h" className="card relative p-4 sm:p-6">
        <label id="compose-h" htmlFor="brief" className="label">Your project, in your own words</label>
        <div className="relative mt-2">
          <textarea
            id="brief" value={text} onChange={(e) => setText(e.target.value)} disabled={busy} rows={7} maxLength={6000}
            placeholder="Messy is fine. What do you need, who is it for, roughly what budget and by when?"
            className={`field !min-h-[190px] resize-y !p-5 text-lg leading-relaxed ${busy ? "invisible" : ""}`}
            aria-describedby={error ? "compose-error" : undefined}
          />
          {busy && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible p-5 text-lg leading-relaxed" style={{ zIndex: 20 }}>
              {words.map((w, i) => {
                const t = targets?.[i];
                return (
                  <motion.span
                    key={i} ref={(el) => { wordRefs.current[i] = el; }}
                    className="inline-block text-ink"
                    initial={false}
                    animate={reduce ? { opacity: 0 } : t ? { x: [0, t.jx, t.dx], y: [0, t.jy, t.dy], rotate: [0, t.rot * 0.4, t.rot], opacity: [1, 1, 0], scale: [1, 1.12, 0.5] } : { x: 0, y: 0, opacity: 1 }}
                    transition={reduce ? { duration: 0.3 } : { delay: 0.25 + i * 0.022, duration: 1.05, times: [0, 0.3, 1], ease: [0.5, 0, 0.2, 1] }}
                  >
                    {w}&nbsp;
                  </motion.span>
                );
              })}
            </div>
          )}
        </div>

        {error && <p id="compose-error" role="alert" className="mt-3 text-sm text-risk">{error}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
            {phase === "loading" ? "Reading your brief" : phase === "ready" ? "Brief ready" : "Turn this into a brief"}
          </button>
          <span className="text-xs text-muted" aria-live="polite">{busy ? "Breaking it into tiles" : `${text.trim() ? text.trim().split(/\s+/).length : 0} words`}</span>
        </div>

        {!busy && (
          <div className="mt-5 border-t border-line pt-4">
            <div className="label mb-2">Or start from an example</div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button key={ex.label} type="button" className="chip hover:bg-sunken !min-h-[36px] !px-3 text-sm" onClick={() => { setText(ex.text); setError(null); }}>
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section ref={canvasRef} aria-label="Brief mosaic" aria-busy={phase === "loading"}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-2xl">{phase === "idle" ? "Your brief will form here" : phase === "loading" ? "Reading your brief" : "Your brief"}</h2>
          <span className="text-xs text-muted" role="status">{phase === "loading" ? "This takes a few seconds" : phase === "ready" ? "Opening the review" : ""}</span>
        </div>
        <BriefBoard brief={brief} phase={phase} budget={budget} deadlineDays={brief?.suggestedTimelineDays ?? 30} />
      </section>
    </div>
  );
}
