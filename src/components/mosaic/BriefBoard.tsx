"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { money } from "@/lib/format";
import type { StructuredBrief } from "@/lib/types";
import { BRIEF_SHAPES } from "../notch";
import { TileShape } from "../TileShape";

export type BoardPhase = "idle" | "loading" | "ready";

type Adjust = {
  value: number; min: number; max: number; step: number; onChange: (n: number) => void;
  format: (n: number) => string; label: string; band?: [number, number];
};

function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="mt-3 space-y-2" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3" style={{ width: `${88 - i * 18}%` }} />
      ))}
    </div>
  );
}

function BoardTile({
  id, label, phase, index, children, adjust, className = "",
}: {
  id: keyof typeof BRIEF_SHAPES; label: string; phase: BoardPhase; index: number;
  children: React.ReactNode; adjust?: Adjust; className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; v: number; w: number } | null>(null);
  const idle = phase === "idle";

  const snap = (a: Adjust, v: number) => Math.min(a.max, Math.max(a.min, Math.round(v / a.step) * a.step));

  const interactive = adjust && !idle && phase === "ready";
  const sliderProps = interactive
    ? {
        role: "slider" as const, tabIndex: 0,
        "aria-label": `${adjust.label}. Drag or use arrow keys to adjust`,
        "aria-valuemin": adjust.min, "aria-valuemax": adjust.max, "aria-valuenow": adjust.value, "aria-valuetext": adjust.format(adjust.value),
        onKeyDown: (e: React.KeyboardEvent) => {
          const big = e.shiftKey ? 10 : 1;
          const delta = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
          if (delta) { e.preventDefault(); adjust.onChange(snap(adjust, adjust.value + delta * big * adjust.step)); }
          else if (e.key === "Home") { e.preventDefault(); adjust.onChange(adjust.min); }
          else if (e.key === "End") { e.preventDefault(); adjust.onChange(adjust.max); }
        },
        onPointerDown: (e: React.PointerEvent) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, v: adjust.value, w: (e.currentTarget as HTMLElement).getBoundingClientRect().width };
        },
        onPointerMove: (e: React.PointerEvent) => {
          if (!drag.current) return;
          const { x, v, w } = drag.current;
          adjust.onChange(snap(adjust, v + ((e.clientX - x) / w) * (adjust.max - adjust.min)));
        },
        onPointerUp: () => { drag.current = null; },
        onPointerCancel: () => { drag.current = null; },
        style: { touchAction: "pan-y" as const },
      }
    : {};

  const pct = adjust ? ((adjust.value - adjust.min) / (adjust.max - adjust.min)) * 100 : 0;

  return (
    <motion.div
      ref={ref}
      data-tile={id}
      key={idle ? "idle" : "solid"}
      initial={reduce ? false : idle ? false : { opacity: 0.2, scale: 0.9, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 22, delay: phase === "loading" ? index * 0.34 : 0 }}
      className={`relative min-h-[110px] ${interactive ? "cursor-ew-resize select-none" : ""} ${className}`}
      {...sliderProps}
    >
      <TileShape
        spec={BRIEF_SHAPES[id]}
        dashed={idle}
        className={idle ? "fill-transparent stroke-muted/60" : interactive ? "fill-surface stroke-line group-hover:stroke-accent" : "fill-surface stroke-line"}
      />
      <div className="relative p-4">
        <div className="label">{label}</div>
        {children}
        {interactive && adjust && (
          <div className="mt-3" aria-hidden="true">
            <div className="relative h-1.5 rounded-full bg-sunken">
              {adjust.band && (
                <div className="absolute inset-y-0 rounded-full bg-accent/25" style={{ left: `${((adjust.band[0] - adjust.min) / (adjust.max - adjust.min)) * 100}%`, width: `${((adjust.band[1] - adjust.band[0]) / (adjust.max - adjust.min)) * 100}%` }} />
              )}
              <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-accent bg-surface" style={{ left: `${pct}%` }} />
            </div>
            <div className="mt-1.5 text-[11px] text-muted">Drag or use arrow keys{adjust.band ? " · shaded range is suggested" : ""}</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function BriefBoard({
  brief, phase, budget, deadlineDays, onBudget, onTimeline, compact = false,
}: {
  brief: StructuredBrief | null; phase: BoardPhase; budget: number; deadlineDays: number;
  onBudget?: (n: number) => void; onTimeline?: (n: number) => void; compact?: boolean;
}) {
  const ready = phase === "ready" && brief;
  const range = brief?.suggestedBudgetRange;
  const bMin = range ? Math.max(500, Math.round((range.low * 0.4) / 100) * 100) : 500;
  const bMax = range ? Math.max(bMin + 1000, Math.round((range.high * 2) / 100) * 100) : 20000;
  const tMax = Math.max(120, Math.round((brief?.suggestedTimelineDays ?? 30) * 2.5));

  const gap = compact ? "gap-3.5" : "gap-4";
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${gap}`}>
      <BoardTile id="deliverables" label="Deliverables" phase={phase} index={0} className="sm:col-span-2">
        {ready ? (
          <ul className="mt-2 space-y-1.5 text-sm">
            {brief.deliverables.map((d, i) => (
              <li key={i} className="flex gap-2"><span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-[1px] bg-accent" />{d}</li>
            ))}
          </ul>
        ) : phase === "loading" ? <Skeleton lines={4} /> : <p className="mt-2 text-sm text-muted">What you want delivered</p>}
      </BoardTile>

      <BoardTile id="skills" label="Skills" phase={phase} index={1}>
        {ready ? (
          <div className="mt-2 flex flex-wrap gap-1.5">{brief.requiredSkills.map((s) => <span key={s} className="chip chip-accent">{s}</span>)}</div>
        ) : phase === "loading" ? <Skeleton lines={2} /> : <p className="mt-2 text-sm text-muted">What it takes</p>}
      </BoardTile>

      <BoardTile
        id="budget" label="Budget" phase={phase} index={2}
        adjust={ready && onBudget && range ? { value: budget, min: bMin, max: bMax, step: 50, onChange: onBudget, format: money, label: "Budget", band: [range.low, range.high] } : undefined}
      >
        {ready ? (
          <>
            <div className="mt-1 font-display text-4xl leading-none">{money(budget)}</div>
            <div className="mt-1 text-xs text-muted">Suggested {money(range!.low)} to {money(range!.high)}</div>
          </>
        ) : phase === "loading" ? <Skeleton lines={2} /> : <p className="mt-2 text-sm text-muted">What you can spend</p>}
      </BoardTile>

      <BoardTile
        id="timeline" label="Timeline" phase={phase} index={3}
        adjust={ready && onTimeline ? { value: deadlineDays, min: 3, max: tMax, step: 1, onChange: onTimeline, format: (n) => `${n} days`, label: "Timeline in days" } : undefined}
      >
        {ready ? (
          <>
            <div className="mt-1 font-display text-4xl leading-none">{deadlineDays}<span className="ml-1 text-xl text-muted">days</span></div>
            <div className="mt-1 text-xs text-muted">{deadlineDays > 21 ? `About ${Math.round(deadlineDays / 7)} weeks · ` : ""}Suggested {brief!.suggestedTimelineDays} days</div>
          </>
        ) : phase === "loading" ? <Skeleton lines={2} /> : <p className="mt-2 text-sm text-muted">When you need it</p>}
      </BoardTile>

      <BoardTile id="tone" label="Tone" phase={phase} index={4} className="sm:col-span-2">
        {ready ? <p className="mt-2 font-display text-2xl">{brief.tone}</p> : phase === "loading" ? <Skeleton lines={1} /> : <p className="mt-2 text-sm text-muted">How it should feel</p>}
      </BoardTile>
    </div>
  );
}
