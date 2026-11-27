"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import { money } from "@/lib/format";
import type { MatchScore } from "@/lib/scoring";
import type { FreelancerDTO } from "@/lib/types";
import { Avatar } from "../CoverArt";
import { hashSeed, matchShape } from "../notch";
import { useSound } from "../Providers";
import { TileShape } from "../TileShape";

export type Note = { explanation: string; watchOut: string; source: "ai" | "fallback"; key: string };

export const SLACK = 56; // room on the right so a tile that stops short can sit inside the column

export function FitMeter({ score }: { score: MatchScore }) {
  const p = score.parts;
  const rows: [string, number][] = [["Skills", p.skills], ["Experience", p.experience], ["Budget", p.budget], ["Availability", p.availability]];
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-3xl leading-none">{score.total}</span>
      <div className="flex flex-col gap-[3px]" role="img" aria-label={`Fit ${score.total} out of 100. ${rows.map(([n, v]) => `${n} ${Math.round(v * 100)} percent`).join(", ")}`}>
        {rows.map(([n, v]) => (
          <span key={n} className="block h-[3px] w-10 rounded-full bg-sunken"><span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round(v * 100)}%` }} /></span>
        ))}
      </div>
    </div>
  );
}

export function MatchBody({ f, score, note, stale, pending, required }: { f: FreelancerDTO; score: MatchScore; note?: Note; stale: boolean; pending: boolean; required: string[] }) {
  return (
    <>
      <div className="flex items-start gap-3">
        <Avatar name={f.name} hue={f.hue} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{f.name}</div>
          <div className="line-clamp-2 text-sm text-muted">{f.headline}</div>
        </div>
        <FitMeter score={score} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {required.map((s) => {
          const miss = score.missingSkills.includes(s);
          return <span key={s} className={`chip ${miss ? "chip-gap" : "chip-accent"}`}>{miss ? `needs ${s}` : s}</span>;
        })}
      </div>

      <div className={`mt-3 space-y-2 text-sm ${stale ? "opacity-60" : ""}`} aria-busy={pending}>
        {note ? (
          <>
            <p>{note.explanation}</p>
            <p className="flex gap-2 text-warn"><span className="mt-0.5 shrink-0 text-xs font-semibold uppercase tracking-wide">Watch out</span><span className="text-ink/90">{note.watchOut}</span></p>
          </>
        ) : (
          <div aria-label="Writing notes" className="space-y-2"><div className="skeleton h-3 w-11/12" /><div className="skeleton h-3 w-8/12" /></div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2 text-xs text-muted">
        <span>{money(f.hourlyRate)}/h</span><span>{f.yearsExperience} yrs</span><span>{f.availabilityHoursPerWeek} h/week</span><span>{f.timezone.split("/")[1]?.replace("_", " ")}</span>
      </div>
    </>
  );
}

export function MatchTile({
  f, score, note, stale, pending, required, index, onOpen,
}: {
  f: FreelancerDTO; score: MatchScore; note?: Note; stale: boolean; pending: boolean; required: string[]; index: number; onOpen: () => void;
}) {
  const reduce = useReducedMotion();
  const { playSeat } = useSound();
  const lastSeat = useRef<MatchScore["seat"] | null>(null);
  const [jiggle, setJiggle] = useState(false);
  const shape = matchShape(hashSeed(f.id));
  const seated = score.seat === "snap";
  const gapPx = seated ? 0 : Math.round(18 + score.gap * 38);
  const label = score.gaps[0]?.label ?? "partial fit";

  function settled() {
    // Click when a tile newly seats; jiggle once when it stops short.
    if (seated && lastSeat.current !== "snap") playSeat();
    if (!seated && lastSeat.current === null && !reduce) { setJiggle(true); setTimeout(() => setJiggle(false), 700); }
    lastSeat.current = score.seat;
  }

  return (
    <motion.li
      layout={!reduce} layoutId={reduce ? undefined : f.id}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
      className="relative list-none" style={{ paddingRight: SLACK }}
    >
      <div className="relative">
        {/* The empty seat, drawn as a dashed outline. It stays visible in any gap. */}
        <div aria-hidden="true" className="absolute inset-0"><TileShape spec={shape} dashed className="fill-transparent stroke-warn/70" /></div>
        {!seated && (
          <span aria-hidden="true" className="chip chip-gap absolute -top-3 left-4 z-20 bg-bg shadow-sm">{label}</span>
        )}

        <motion.div
          initial={reduce ? false : { x: 190, opacity: 0 }}
          animate={{ x: gapPx, opacity: 1 }}
          transition={reduce ? { duration: 0 } : seated ? { type: "spring", stiffness: 430, damping: 17, mass: 0.9, delay: 0.15 + index * 0.3 } : { type: "spring", stiffness: 160, damping: 20, delay: 0.15 + index * 0.3 }}
          onAnimationComplete={settled}
          className={`relative ${jiggle ? "motion-safe:animate-[jiggle_0.6s_ease-in-out]" : ""}`}
        >
          <div
            role="button" tabIndex={0} onClick={onOpen}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
            aria-label={`${f.name}, fit ${score.total}. ${seated ? "Fits the brief." : `Does not fully fit: ${score.gaps.map((g) => g.label).join(", ") || "partial fit"}.`} Press Enter for details.`}
            className="group relative cursor-pointer p-4 pl-6"
          >
            <TileShape spec={shape} className={`${seated ? "fill-surface stroke-accent" : "fill-surface stroke-line"} group-hover:stroke-accent`} />
            <div className="relative"><MatchBody f={f} score={score} note={note} stale={stale} pending={pending} required={required} /></div>
          </div>
        </motion.div>
      </div>
    </motion.li>
  );
}
